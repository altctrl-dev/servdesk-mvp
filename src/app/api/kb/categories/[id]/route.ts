/**
 * Knowledge Base Categories API Route - Individual Category
 *
 * GET: Get single category with article count
 * PATCH: Update category (ADMIN, SUPER_ADMIN only)
 * DELETE: Delete category (ADMIN, SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, kbCategories, kbArticles, type UserRole } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";
import {
  generateSlug,
  ensureUniqueSlug,
  hasChildCategories,
  wouldCreateCycle,
} from "@/lib/kb";

export const runtime = "edge";

// =============================================================================
// CONSTANTS
// =============================================================================

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for updating a category
 */
const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

// =============================================================================
// GET: Get Single Category
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require any authenticated user
    const session = await getSessionWithRole();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "Unauthorized: Account is disabled" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the category
    const [category] = await db
      .select()
      .from(kbCategories)
      .where(eq(kbCategories.id, id))
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        articleCount: category.articleCount,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH: Update Category (ADMIN, SUPER_ADMIN only)
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Require any authenticated user first
    const session = await getSessionWithRole();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "Unauthorized: Account is disabled" },
        { status: 403 }
      );
    }

    // Check admin role
    if (!hasAnyRole(session.roles, ADMIN_ROLES)) {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN or SUPER_ADMIN can update categories" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get existing category
    const [existingCategory] = await db
      .select()
      .from(kbCategories)
      .where(eq(kbCategories.id, id))
      .limit(1);

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // If parentId is being set, validate it
    if (updates.parentId !== undefined && updates.parentId !== null) {
      // Check parent exists
      const [parentCategory] = await db
        .select({ id: kbCategories.id })
        .from(kbCategories)
        .where(eq(kbCategories.id, updates.parentId))
        .limit(1);

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        );
      }

      // Check for circular reference
      const createsCycle = await wouldCreateCycle(db, id, updates.parentId);
      if (createsCycle) {
        return NextResponse.json(
          { error: "Cannot set parent: would create circular reference" },
          { status: 400 }
        );
      }
    }

    // Build update values
    const updateValues: Partial<typeof kbCategories.$inferInsert> & {
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // Handle name change and slug regeneration
    if (updates.name !== undefined && updates.name !== existingCategory.name) {
      updateValues.name = updates.name;
      const baseSlug = generateSlug(updates.name);
      updateValues.slug = await ensureUniqueSlug(db, "categories", baseSlug, id);
    }

    if (updates.description !== undefined) {
      updateValues.description = updates.description;
    }

    if (updates.parentId !== undefined) {
      updateValues.parentId = updates.parentId;
    }

    if (updates.sortOrder !== undefined) {
      updateValues.sortOrder = updates.sortOrder;
    }

    // Update the category
    const [updatedCategory] = await db
      .update(kbCategories)
      .set(updateValues)
      .where(eq(kbCategories.id, id))
      .returning();

    return NextResponse.json({
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        slug: updatedCategory.slug,
        description: updatedCategory.description,
        parentId: updatedCategory.parentId,
        sortOrder: updatedCategory.sortOrder,
        articleCount: updatedCategory.articleCount,
        createdAt: updatedCategory.createdAt.toISOString(),
        updatedAt: updatedCategory.updatedAt.toISOString(),
      },
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Delete Category (ADMIN, SUPER_ADMIN only)
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require any authenticated user first
    const session = await getSessionWithRole();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "Unauthorized: Account is disabled" },
        { status: 403 }
      );
    }

    // Check admin role
    if (!hasAnyRole(session.roles, ADMIN_ROLES)) {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN or SUPER_ADMIN can delete categories" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Check if category exists
    const [existingCategory] = await db
      .select()
      .from(kbCategories)
      .where(eq(kbCategories.id, id))
      .limit(1);

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check for child categories
    const hasChildren = await hasChildCategories(db, id);
    if (hasChildren) {
      return NextResponse.json(
        {
          error:
            "Cannot delete category with child categories. Delete or reassign child categories first.",
        },
        { status: 409 }
      );
    }

    // Update articles to remove this category (set categoryId to null)
    await db
      .update(kbArticles)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(eq(kbArticles.categoryId, id));

    // Delete the category
    await db.delete(kbCategories).where(eq(kbCategories.id, id));

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

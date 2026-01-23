/**
 * Knowledge Base Categories API Route
 *
 * GET: List all categories (flat or tree structure)
 * POST: Create a new category (ADMIN, SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, kbCategories, type UserRole } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { asc } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";
import { generateSlug, ensureUniqueSlug, buildCategoryTree } from "@/lib/kb";

export const runtime = "edge";

// =============================================================================
// CONSTANTS
// =============================================================================

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for creating a new category
 */
const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// =============================================================================
// GET: List Categories
// =============================================================================

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const flat = searchParams.get("flat") === "true";

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Fetch all categories
    const categories = await db
      .select()
      .from(kbCategories)
      .orderBy(asc(kbCategories.sortOrder), asc(kbCategories.name));

    // Format category for response
    const formatCategory = (category: typeof kbCategories.$inferSelect) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      articleCount: category.articleCount,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    });

    // Return flat list or tree based on query param
    if (flat) {
      return NextResponse.json({
        categories: categories.map(formatCategory),
      });
    }

    // Build tree structure for ADMIN+ users
    const tree = buildCategoryTree(categories);

    // Format tree with children
    const formatTreeNode = (
      node: ReturnType<typeof buildCategoryTree>[number]
    ): ReturnType<typeof formatCategory> & { children: unknown[] } => ({
      ...formatCategory(node),
      children: node.children.map(formatTreeNode),
    });

    return NextResponse.json({
      tree: tree.map(formatTreeNode),
    });
  } catch (error) {
    console.error("Error listing categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create Category (ADMIN, SUPER_ADMIN only)
// =============================================================================

export async function POST(request: NextRequest) {
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
        { error: "Forbidden: Only ADMIN or SUPER_ADMIN can create categories" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createCategorySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { name, description, parentId, sortOrder } = validationResult.data;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // If parentId is provided, verify it exists
    if (parentId) {
      const [parentCategory] = await db
        .select({ id: kbCategories.id })
        .from(kbCategories)
        .where(eq(kbCategories.id, parentId))
        .limit(1);

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        );
      }
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(db, "categories", baseSlug);

    // Create the category
    const [newCategory] = await db
      .insert(kbCategories)
      .values({
        name,
        slug,
        description: description || null,
        parentId: parentId || null,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json(
      {
        category: {
          id: newCategory.id,
          name: newCategory.name,
          slug: newCategory.slug,
          description: newCategory.description,
          parentId: newCategory.parentId,
          sortOrder: newCategory.sortOrder,
          articleCount: newCategory.articleCount,
          createdAt: newCategory.createdAt.toISOString(),
          updatedAt: newCategory.updatedAt.toISOString(),
        },
        message: "Category created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Import eq for parent category check
import { eq } from "drizzle-orm";

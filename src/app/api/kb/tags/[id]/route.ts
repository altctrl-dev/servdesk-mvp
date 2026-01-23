/**
 * Knowledge Base Tags API Route - Individual Tag
 *
 * GET: Get single tag with article count
 * PATCH: Update tag name (ADMIN, SUPER_ADMIN only)
 * DELETE: Delete tag (ADMIN, SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, kbTags, type UserRole } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";
import { generateSlug, ensureUniqueSlug } from "@/lib/kb";

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
 * Schema for updating a tag
 */
const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
});

// =============================================================================
// GET: Get Single Tag
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
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the tag
    const [tag] = await db
      .select()
      .from(kbTags)
      .where(eq(kbTags.id, id))
      .limit(1);

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json({
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        articleCount: tag.articleCount,
        createdAt: tag.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH: Update Tag (ADMIN, SUPER_ADMIN only)
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
        { error: "Forbidden: Only ADMIN or SUPER_ADMIN can update tags" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTagSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get existing tag
    const [existingTag] = await db
      .select()
      .from(kbTags)
      .where(eq(kbTags.id, id))
      .limit(1);

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if another tag with the same name exists
    if (name !== existingTag.name) {
      const duplicateTag = await db
        .select({ id: kbTags.id })
        .from(kbTags)
        .where(and(eq(kbTags.name, name), ne(kbTags.id, id)))
        .limit(1);

      if (duplicateTag.length > 0) {
        return NextResponse.json(
          { error: "A tag with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Generate new slug if name changed
    let newSlug = existingTag.slug;
    if (name !== existingTag.name) {
      const baseSlug = generateSlug(name);
      newSlug = await ensureUniqueSlug(db, "tags", baseSlug, id);
    }

    // Update the tag
    const [updatedTag] = await db
      .update(kbTags)
      .set({
        name,
        slug: newSlug,
      })
      .where(eq(kbTags.id, id))
      .returning();

    return NextResponse.json({
      tag: {
        id: updatedTag.id,
        name: updatedTag.name,
        slug: updatedTag.slug,
        articleCount: updatedTag.articleCount,
        createdAt: updatedTag.createdAt.toISOString(),
      },
      message: "Tag updated successfully",
    });
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Delete Tag (ADMIN, SUPER_ADMIN only)
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
        { error: "Forbidden: Only ADMIN or SUPER_ADMIN can delete tags" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Check if tag exists
    const [existingTag] = await db
      .select()
      .from(kbTags)
      .where(eq(kbTags.id, id))
      .limit(1);

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete the tag
    // The kb_article_tags junction table has ON DELETE CASCADE,
    // so tag associations will be automatically removed
    await db.delete(kbTags).where(eq(kbTags.id, id));

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

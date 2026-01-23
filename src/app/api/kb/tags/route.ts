/**
 * Knowledge Base Tags API Route
 *
 * GET: List all tags (sorted by articleCount desc, then name)
 * POST: Create a new tag (ADMIN, SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, kbTags, type UserRole } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { desc, asc, like, eq } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";
import { generateSlug, ensureUniqueSlug } from "@/lib/kb";

export const runtime = "edge";

// =============================================================================
// CONSTANTS
// =============================================================================

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for creating a new tag
 */
const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
});

// =============================================================================
// GET: List Tags
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
    const search = searchParams.get("search");

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Fetch tags with optional search filter
    const tags = search
      ? await db
          .select()
          .from(kbTags)
          .where(like(kbTags.name, `%${search}%`))
          .orderBy(desc(kbTags.articleCount), asc(kbTags.name))
      : await db
          .select()
          .from(kbTags)
          .orderBy(desc(kbTags.articleCount), asc(kbTags.name));

    // Format tag for response
    const formatTag = (tag: typeof kbTags.$inferSelect) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      articleCount: tag.articleCount,
      createdAt: tag.createdAt.toISOString(),
    });

    return NextResponse.json({
      tags: tags.map(formatTag),
    });
  } catch (error) {
    console.error("Error listing tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create Tag (ADMIN, SUPER_ADMIN only)
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
        { error: "Forbidden: Only ADMIN or SUPER_ADMIN can create tags" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTagSchema.safeParse(body);

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

    // Check if tag with same name already exists (case-insensitive comparison)
    const existingTag = await db
      .select({ id: kbTags.id })
      .from(kbTags)
      .where(eq(kbTags.name, name))
      .limit(1);

    if (existingTag.length > 0) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(db, "tags", baseSlug);

    // Create the tag
    const [newTag] = await db
      .insert(kbTags)
      .values({
        name,
        slug,
      })
      .returning();

    return NextResponse.json(
      {
        tag: {
          id: newTag.id,
          name: newTag.name,
          slug: newTag.slug,
          articleCount: newTag.articleCount,
          createdAt: newTag.createdAt.toISOString(),
        },
        message: "Tag created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

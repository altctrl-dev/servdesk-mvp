/**
 * Knowledge Base Articles API Route - Individual Article
 *
 * GET: Get single article with full details
 * PATCH: Update article (SUPERVISOR+ for content, ADMIN+ for status changes)
 * DELETE: Delete article (SUPERVISOR+ for soft delete, ADMIN+ for hard delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import {
  getDb,
  kbArticles,
  kbCategories,
  kbTags,
  kbArticleTags,
  type UserRole,
  KB_ARTICLE_STATUSES,
} from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";
import { generateSlug, ensureUniqueSlug, updateArticleCount } from "@/lib/kb";

export const runtime = "edge";

// =============================================================================
// CONSTANTS
// =============================================================================

const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
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
 * Schema for updating an article
 */
const updateArticleSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  content: z.string().min(1, "Content is required").optional(),
  excerpt: z
    .string()
    .max(500, "Excerpt must be 500 characters or less")
    .optional()
    .nullable(),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(KB_ARTICLE_STATUSES).optional(),
});

// =============================================================================
// GET: Get Single Article
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
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the article with category info
    const [article] = await db
      .select({
        id: kbArticles.id,
        title: kbArticles.title,
        slug: kbArticles.slug,
        content: kbArticles.content,
        excerpt: kbArticles.excerpt,
        status: kbArticles.status,
        categoryId: kbArticles.categoryId,
        categoryName: kbCategories.name,
        authorId: kbArticles.authorId,
        viewCount: kbArticles.viewCount,
        publishedAt: kbArticles.publishedAt,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .where(eq(kbArticles.id, id))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Check access: AGENT can only see PUBLISHED or own articles
    const isSupervisorPlus = hasAnyRole(session.roles, SUPERVISOR_ROLES);
    const isAuthor = article.authorId === session.user.id;

    if (!isSupervisorPlus && article.status !== "PUBLISHED" && !isAuthor) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Increment view count if PUBLISHED (non-blocking)
    if (article.status === "PUBLISHED") {
      db.update(kbArticles)
        .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
        .where(eq(kbArticles.id, id))
        .execute()
        .catch((err) => console.error("Error incrementing view count:", err));
    }

    // Get author info from Better Auth's user table
    const [author] = await db.all<{ id: string; email: string; name: string | null }>(
      sql`SELECT id, email, name FROM user WHERE id = ${article.authorId} LIMIT 1`
    );

    // Get tags for this article
    const articleTags = await db
      .select({
        id: kbTags.id,
        name: kbTags.name,
        slug: kbTags.slug,
      })
      .from(kbArticleTags)
      .innerJoin(kbTags, eq(kbArticleTags.tagId, kbTags.id))
      .where(eq(kbArticleTags.articleId, id));

    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        status: article.status,
        categoryId: article.categoryId,
        categoryName: article.categoryName,
        tags: articleTags,
        authorId: article.authorId,
        authorName: author?.name || author?.email || "Unknown",
        authorEmail: author?.email || "",
        viewCount: article.viewCount,
        publishedAt: article.publishedAt
          ? Math.floor(article.publishedAt.getTime() / 1000)
          : null,
        createdAt: Math.floor(article.createdAt.getTime() / 1000),
        updatedAt: Math.floor(article.updatedAt.getTime() / 1000),
      },
    });
  } catch (error) {
    console.error("Error getting article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================================
// PATCH: Update Article
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

    // Check supervisor+ role for any update
    if (!hasAnyRole(session.roles, SUPERVISOR_ROLES)) {
      return NextResponse.json(
        { error: "Forbidden: Only SUPERVISOR, ADMIN, or SUPER_ADMIN can update articles" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateArticleSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { title, content, excerpt, categoryId, tagIds, status } = validationResult.data;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get existing article
    const [existingArticle] = await db
      .select()
      .from(kbArticles)
      .where(eq(kbArticles.id, id))
      .limit(1);

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Check status transition permissions
    const isAdmin = hasAnyRole(session.roles, ADMIN_ROLES);
    const currentStatus = existingArticle.status;
    const newStatus = status || currentStatus;

    // Status change validation
    if (status && status !== currentStatus) {
      // Transitions involving PUBLISHED or ARCHIVED require ADMIN+
      const requiresAdmin =
        currentStatus === "PUBLISHED" ||
        currentStatus === "ARCHIVED" ||
        newStatus === "PUBLISHED" ||
        newStatus === "ARCHIVED";

      if (requiresAdmin && !isAdmin) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Status changes to/from PUBLISHED or ARCHIVED require ADMIN or SUPER_ADMIN role",
          },
          { status: 403 }
        );
      }
    }

    // Validate categoryId if provided
    if (categoryId !== undefined && categoryId !== null) {
      const [category] = await db
        .select({ id: kbCategories.id })
        .from(kbCategories)
        .where(eq(kbCategories.id, categoryId))
        .limit(1);

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 }
        );
      }
    }

    // Validate tagIds if provided
    if (tagIds && tagIds.length > 0) {
      const existingTags = await db
        .select({ id: kbTags.id })
        .from(kbTags)
        .where(inArray(kbTags.id, tagIds));

      if (existingTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: "One or more tags not found" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Partial<typeof kbArticles.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Handle slug regeneration if title changes
    if (title !== undefined && title !== existingArticle.title) {
      updateData.title = title;
      const baseSlug = generateSlug(title);
      updateData.slug = await ensureUniqueSlug(db, "articles", baseSlug, id);
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    if (excerpt !== undefined) {
      updateData.excerpt = excerpt;
    }

    // Handle category change and article count updates
    const oldCategoryId = existingArticle.categoryId;
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }

    // Handle status transitions
    if (status !== undefined && status !== currentStatus) {
      updateData.status = status;

      // Set publishedAt when transitioning to PUBLISHED
      if (status === "PUBLISHED" && currentStatus !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }

      // Clear publishedAt when transitioning from ARCHIVED to DRAFT
      if (status === "DRAFT" && currentStatus === "ARCHIVED") {
        updateData.publishedAt = null;
      }
    }

    // Update the article
    const [updatedArticle] = await db
      .update(kbArticles)
      .set(updateData)
      .where(eq(kbArticles.id, id))
      .returning();

    // Handle tag associations if tagIds provided
    if (tagIds !== undefined) {
      // Get existing tag IDs
      const existingTagIds = await db
        .select({ tagId: kbArticleTags.tagId })
        .from(kbArticleTags)
        .where(eq(kbArticleTags.articleId, id));

      const existingTagIdSet = new Set(existingTagIds.map((t) => t.tagId));
      const newTagIdSet = new Set(tagIds);

      // Delete removed tag associations
      await db
        .delete(kbArticleTags)
        .where(eq(kbArticleTags.articleId, id));

      // Insert new tag associations
      if (tagIds.length > 0) {
        await db.insert(kbArticleTags).values(
          tagIds.map((tagId) => ({
            articleId: id,
            tagId,
          }))
        );
      }

      // Update affected tag article counts
      const affectedTags = new Set([...existingTagIdSet, ...newTagIdSet]);
      for (const tagId of affectedTags) {
        await updateArticleCount(db, "tag", tagId);
      }
    }

    // Update category article counts if category changed
    if (categoryId !== undefined && categoryId !== oldCategoryId) {
      if (oldCategoryId) {
        await updateArticleCount(db, "category", oldCategoryId);
      }
      if (categoryId) {
        await updateArticleCount(db, "category", categoryId);
      }
    }

    return NextResponse.json({
      article: {
        id: updatedArticle.id,
        title: updatedArticle.title,
        slug: updatedArticle.slug,
        excerpt: updatedArticle.excerpt,
        status: updatedArticle.status,
        categoryId: updatedArticle.categoryId,
        authorId: updatedArticle.authorId,
        viewCount: updatedArticle.viewCount,
        publishedAt: updatedArticle.publishedAt
          ? Math.floor(updatedArticle.publishedAt.getTime() / 1000)
          : null,
        createdAt: Math.floor(updatedArticle.createdAt.getTime() / 1000),
        updatedAt: Math.floor(updatedArticle.updatedAt.getTime() / 1000),
      },
      message: "Article updated successfully",
    });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================================
// DELETE: Delete Article
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Check for permanent delete
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    // Role check: SUPERVISOR+ for soft delete, ADMIN+ for hard delete
    const requiredRoles = permanent ? ADMIN_ROLES : SUPERVISOR_ROLES;
    if (!hasAnyRole(session.roles, requiredRoles)) {
      const roleDescription = permanent
        ? "ADMIN or SUPER_ADMIN"
        : "SUPERVISOR, ADMIN, or SUPER_ADMIN";
      return NextResponse.json(
        { error: `Forbidden: Only ${roleDescription} can ${permanent ? "permanently " : ""}delete articles` },
        { status: 403 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get existing article
    const [existingArticle] = await db
      .select()
      .from(kbArticles)
      .where(eq(kbArticles.id, id))
      .limit(1);

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (permanent) {
      // Get associated tag IDs for count update
      const articleTags = await db
        .select({ tagId: kbArticleTags.tagId })
        .from(kbArticleTags)
        .where(eq(kbArticleTags.articleId, id));

      const tagIds = articleTags.map((t) => t.tagId);
      const categoryId = existingArticle.categoryId;

      // Hard delete - cascade will handle tag associations
      await db.delete(kbArticles).where(eq(kbArticles.id, id));

      // Update tag article counts
      for (const tagId of tagIds) {
        await updateArticleCount(db, "tag", tagId);
      }

      // Update category article count
      if (categoryId) {
        await updateArticleCount(db, "category", categoryId);
      }

      return NextResponse.json({
        success: true,
        message: "Article permanently deleted",
      });
    } else {
      // Soft delete - set status to ARCHIVED
      await db
        .update(kbArticles)
        .set({
          status: "ARCHIVED",
          updatedAt: new Date(),
        })
        .where(eq(kbArticles.id, id));

      return NextResponse.json({
        success: true,
        message: "Article archived",
      });
    }
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

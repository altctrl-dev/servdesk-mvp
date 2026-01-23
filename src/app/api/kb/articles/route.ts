/**
 * Knowledge Base Articles API Route
 *
 * GET: List articles with filtering and pagination
 * POST: Create a new article (SUPERVISOR+ only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import {
  getDb,
  kbArticles,
  kbCategories,
  kbTags,
  kbArticleTags,
  generateId,
  type UserRole,
  type KBArticleStatus,
} from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, and, or, like, desc, count, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";
import { generateSlug, ensureUniqueSlug, updateArticleCount } from "@/lib/kb";

export const runtime = "edge";

// =============================================================================
// CONSTANTS
// =============================================================================

const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for creating a new article
 */
const createArticleSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500, "Excerpt must be 500 characters or less").optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

// =============================================================================
// GET: List Articles
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as KBArticleStatus | null;
    const categoryId = searchParams.get("categoryId");
    const tagId = searchParams.get("tagId");
    const search = searchParams.get("search");
    const authorId = searchParams.get("authorId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [];
    const isSupervisorPlus = hasAnyRole(session.roles, SUPERVISOR_ROLES);

    // Role-based visibility
    if (!isSupervisorPlus) {
      // AGENT: Only PUBLISHED articles OR articles they authored
      conditions.push(
        or(
          eq(kbArticles.status, "PUBLISHED"),
          eq(kbArticles.authorId, session.user.id)
        )!
      );
    } else if (status) {
      // SUPERVISOR+: Can filter by status
      conditions.push(eq(kbArticles.status, status));
    }

    // Category filter
    if (categoryId) {
      conditions.push(eq(kbArticles.categoryId, categoryId));
    }

    // Author filter (SUPERVISOR+ only)
    if (authorId && isSupervisorPlus) {
      conditions.push(eq(kbArticles.authorId, authorId));
    }

    // Search filter
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(like(kbArticles.title, searchTerm), like(kbArticles.content, searchTerm))!
      );
    }

    // If filtering by tag, get article IDs with that tag first
    let articleIdsWithTag: string[] | null = null;
    if (tagId) {
      const taggedArticles = await db
        .select({ articleId: kbArticleTags.articleId })
        .from(kbArticleTags)
        .where(eq(kbArticleTags.tagId, tagId));
      articleIdsWithTag = taggedArticles.map((t) => t.articleId);

      if (articleIdsWithTag.length === 0) {
        // No articles with this tag
        return NextResponse.json({
          articles: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
      conditions.push(inArray(kbArticles.id, articleIdsWithTag));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(kbArticles)
      .where(whereClause);

    const total = totalResult?.count || 0;

    // Get articles with category info
    const articles = await db
      .select({
        id: kbArticles.id,
        title: kbArticles.title,
        slug: kbArticles.slug,
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
      .where(whereClause)
      .orderBy(desc(kbArticles.createdAt))
      .limit(limit)
      .offset(offset);

    // Get author information from Better Auth's user table
    const authorIds = [...new Set(articles.map((a) => a.authorId))];
    let authorMap = new Map<string, { name: string | null; email: string }>();

    if (authorIds.length > 0) {
      const authors = await db.all<{ id: string; email: string; name: string | null }>(
        sql`SELECT id, email, name FROM user WHERE id IN (${sql.join(
          authorIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
      authorMap = new Map(authors.map((a) => [a.id, { name: a.name, email: a.email }]));
    }

    // Get tags for each article
    const articleIds = articles.map((a) => a.id);
    const tagsByArticle = new Map<string, string[]>();

    if (articleIds.length > 0) {
      const articleTags = await db
        .select({
          articleId: kbArticleTags.articleId,
          tagName: kbTags.name,
        })
        .from(kbArticleTags)
        .innerJoin(kbTags, eq(kbArticleTags.tagId, kbTags.id))
        .where(inArray(kbArticleTags.articleId, articleIds));

      for (const at of articleTags) {
        const existing = tagsByArticle.get(at.articleId) || [];
        existing.push(at.tagName);
        tagsByArticle.set(at.articleId, existing);
      }
    }

    // Format response
    const formattedArticles = articles.map((article) => {
      const author = authorMap.get(article.authorId);
      const tags = tagsByArticle.get(article.id) || [];

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        status: article.status,
        categoryId: article.categoryId,
        categoryName: article.categoryName,
        tagNames: tags.join(", "),
        authorId: article.authorId,
        authorName: author?.name || author?.email || "Unknown",
        viewCount: article.viewCount,
        publishedAt: article.publishedAt
          ? Math.floor(article.publishedAt.getTime() / 1000)
          : null,
        createdAt: Math.floor(article.createdAt.getTime() / 1000),
        updatedAt: Math.floor(article.updatedAt.getTime() / 1000),
      };
    });

    return NextResponse.json({
      articles: formattedArticles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error listing articles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================================
// POST: Create Article (SUPERVISOR+ only)
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

    // Check supervisor+ role
    if (!hasAnyRole(session.roles, SUPERVISOR_ROLES)) {
      return NextResponse.json(
        { error: "Forbidden: Only SUPERVISOR, ADMIN, or SUPER_ADMIN can create articles" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createArticleSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { title, content, excerpt, categoryId, tagIds } = validationResult.data;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // If categoryId is provided, verify it exists
    if (categoryId) {
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

    // Verify all tag IDs exist
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

    // Generate unique slug
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(db, "articles", baseSlug);

    // Create the article
    const articleId = generateId();
    const [newArticle] = await db
      .insert(kbArticles)
      .values({
        id: articleId,
        title,
        slug,
        content,
        excerpt: excerpt || null,
        status: "DRAFT",
        categoryId: categoryId || null,
        authorId: session.user.id,
      })
      .returning();

    // Insert tag associations
    if (tagIds && tagIds.length > 0) {
      await db.insert(kbArticleTags).values(
        tagIds.map((tagId) => ({
          articleId: newArticle.id,
          tagId,
        }))
      );

      // Update tag article counts
      for (const tagId of tagIds) {
        await updateArticleCount(db, "tag", tagId);
      }
    }

    // Update category article count if category is set
    if (categoryId) {
      await updateArticleCount(db, "category", categoryId);
    }

    return NextResponse.json(
      {
        article: {
          id: newArticle.id,
          title: newArticle.title,
          slug: newArticle.slug,
          excerpt: newArticle.excerpt,
          status: newArticle.status,
          categoryId: newArticle.categoryId,
          authorId: newArticle.authorId,
          viewCount: newArticle.viewCount,
          publishedAt: null,
          createdAt: Math.floor(newArticle.createdAt.getTime() / 1000),
          updatedAt: Math.floor(newArticle.updatedAt.getTime() / 1000),
        },
        message: "Article created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

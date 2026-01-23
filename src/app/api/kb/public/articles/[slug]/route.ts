/**
 * Knowledge Base Public Article API Route - Single Article by Slug
 *
 * GET: Get single published article by slug (NO AUTH REQUIRED)
 *
 * This endpoint is publicly accessible for customer-facing knowledge base.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import {
  getDb,
  kbArticles,
  kbCategories,
  kbTags,
  kbArticleTags,
} from "@/db";
import { eq, and, sql } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// =============================================================================
// GET: Get Single Published Article by Slug (Public)
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Article slug is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the article by slug - MUST be PUBLISHED
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
        viewCount: kbArticles.viewCount,
        publishedAt: kbArticles.publishedAt,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .where(and(eq(kbArticles.slug, slug), eq(kbArticles.status, "PUBLISHED")))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Increment view count (non-blocking)
    db.update(kbArticles)
      .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
      .where(eq(kbArticles.id, article.id))
      .execute()
      .catch((err) => console.error("Error incrementing view count:", err));

    // Get tags for this article
    const articleTags = await db
      .select({
        name: kbTags.name,
      })
      .from(kbArticleTags)
      .innerJoin(kbTags, eq(kbArticleTags.tagId, kbTags.id))
      .where(eq(kbArticleTags.articleId, article.id));

    const tagNames = articleTags.map((t) => t.name);

    // Format response (excluding internal fields like authorId)
    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        categoryName: article.categoryName,
        tagNames,
        viewCount: article.viewCount,
        publishedAt: article.publishedAt
          ? Math.floor(article.publishedAt.getTime() / 1000)
          : null,
        createdAt: Math.floor(article.createdAt.getTime() / 1000),
        updatedAt: Math.floor(article.updatedAt.getTime() / 1000),
      },
    });
  } catch (error) {
    console.error("Error getting public article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Knowledge Base Public Articles API Route
 *
 * GET: List published articles (NO AUTH REQUIRED)
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
import { eq, and, or, like, desc, count, inArray } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// GET: List Published Articles (Public)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const tagId = searchParams.get("tagId");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Build where conditions - always filter for PUBLISHED only
    const conditions: ReturnType<typeof eq>[] = [eq(kbArticles.status, "PUBLISHED")];

    // Category filter
    if (categoryId) {
      conditions.push(eq(kbArticles.categoryId, categoryId));
    }

    // Search filter
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(like(kbArticles.title, searchTerm), like(kbArticles.content, searchTerm))!
      );
    }

    // If filtering by tag, get article IDs with that tag first
    if (tagId) {
      const taggedArticles = await db
        .select({ articleId: kbArticleTags.articleId })
        .from(kbArticleTags)
        .where(eq(kbArticleTags.tagId, tagId));

      const articleIdsWithTag = taggedArticles.map((t) => t.articleId);

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

    const whereClause = and(...conditions);

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
        categoryId: kbArticles.categoryId,
        categoryName: kbCategories.name,
        viewCount: kbArticles.viewCount,
        publishedAt: kbArticles.publishedAt,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .where(whereClause)
      .orderBy(desc(kbArticles.publishedAt))
      .limit(limit)
      .offset(offset);

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

    // Format response (excluding internal fields like authorId)
    const formattedArticles = articles.map((article) => {
      const tags = tagsByArticle.get(article.id) || [];

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        categoryName: article.categoryName,
        tagNames: tags,
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
    console.error("Error listing public articles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

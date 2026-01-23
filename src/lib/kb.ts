/**
 * Knowledge Base Helper Functions
 *
 * Provides utilities for KB operations:
 * - Slug generation and uniqueness
 * - Category tree building
 * - Article count updates
 */

import { eq, and, ne, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { kbCategories, kbTags, kbArticles, type KBCategory } from "@/db/schema";

// =============================================================================
// SLUG GENERATION
// =============================================================================

/**
 * Generate a URL-friendly slug from a title.
 *
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Trims leading/trailing hyphens
 *
 * @param title - The title to convert
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Ensure a slug is unique by appending a number if necessary.
 *
 * @param db - Database instance
 * @param table - The table to check ('categories', 'tags', or 'articles')
 * @param slug - The base slug
 * @param excludeId - Optional ID to exclude (for updates)
 * @returns A unique slug
 */
export async function ensureUniqueSlug(
  db: Database,
  table: "categories" | "tags" | "articles",
  slug: string,
  excludeId?: string
): Promise<string> {
  const tableMap = {
    categories: kbCategories,
    tags: kbTags,
    articles: kbArticles,
  };

  const targetTable = tableMap[table];
  let currentSlug = slug;
  let counter = 1;

  while (true) {
    // Build query to check for existing slug
    const whereConditions = excludeId
      ? and(eq(targetTable.slug, currentSlug), ne(targetTable.id, excludeId))
      : eq(targetTable.slug, currentSlug);

    const existing = await db
      .select({ id: targetTable.id })
      .from(targetTable)
      .where(whereConditions)
      .limit(1);

    if (existing.length === 0) {
      return currentSlug;
    }

    // Append counter and try again
    currentSlug = `${slug}-${counter}`;
    counter++;

    // Safety limit to prevent infinite loops
    if (counter > 100) {
      throw new Error("Unable to generate unique slug after 100 attempts");
    }
  }
}

// =============================================================================
// CATEGORY TREE BUILDING
// =============================================================================

/**
 * Category with nested children for tree structure.
 */
export interface CategoryWithChildren extends KBCategory {
  children: CategoryWithChildren[];
}

/**
 * Build a hierarchical tree from a flat list of categories.
 *
 * @param categories - Flat list of categories
 * @returns Tree structure with nested children
 */
export function buildCategoryTree(categories: KBCategory[]): CategoryWithChildren[] {
  // Create a map for quick lookup
  const categoryMap = new Map<string, CategoryWithChildren>();

  // Initialize all categories with empty children array
  for (const category of categories) {
    categoryMap.set(category.id, { ...category, children: [] });
  }

  // Build tree by assigning children to parents
  const rootCategories: CategoryWithChildren[] = [];

  for (const category of categories) {
    const categoryWithChildren = categoryMap.get(category.id)!;

    if (category.parentId && categoryMap.has(category.parentId)) {
      // Has parent, add as child
      categoryMap.get(category.parentId)!.children.push(categoryWithChildren);
    } else {
      // No parent or parent not found, add to root
      rootCategories.push(categoryWithChildren);
    }
  }

  // Sort children at each level by sortOrder, then by name
  const sortCategories = (cats: CategoryWithChildren[]) => {
    cats.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
    for (const cat of cats) {
      sortCategories(cat.children);
    }
  };

  sortCategories(rootCategories);

  return rootCategories;
}

// =============================================================================
// ARTICLE COUNT UPDATES
// =============================================================================

/**
 * Update the article count for a category or tag.
 *
 * This recalculates the count based on actual articles,
 * ensuring the denormalized count stays accurate.
 *
 * @param db - Database instance
 * @param type - Whether to update a 'category' or 'tag'
 * @param id - The ID of the category or tag
 */
export async function updateArticleCount(
  db: Database,
  type: "category" | "tag",
  id: string
): Promise<void> {
  if (type === "category") {
    // Count articles with this category
    const result = await db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(kbArticles)
      .where(eq(kbArticles.categoryId, id));

    const count = result[0]?.count ?? 0;

    await db
      .update(kbCategories)
      .set({ articleCount: count, updatedAt: new Date() })
      .where(eq(kbCategories.id, id));
  } else {
    // For tags, we need to count via the junction table
    // This will be implemented when articles API is created
    // For now, we'll use a raw count from kb_article_tags
    const result = await db.run(
      sql`SELECT COUNT(*) as count FROM kb_article_tags WHERE tag_id = ${id}`
    );

    // D1 returns results differently
    const count = (result.results?.[0] as { count: number })?.count ?? 0;

    await db
      .update(kbTags)
      .set({ articleCount: count })
      .where(eq(kbTags.id, id));
  }
}

/**
 * Check if a category has any child categories.
 *
 * @param db - Database instance
 * @param categoryId - The category ID to check
 * @returns True if the category has children
 */
export async function hasChildCategories(
  db: Database,
  categoryId: string
): Promise<boolean> {
  const children = await db
    .select({ id: kbCategories.id })
    .from(kbCategories)
    .where(eq(kbCategories.parentId, categoryId))
    .limit(1);

  return children.length > 0;
}

/**
 * Check for circular parent reference.
 *
 * Traverses up the parent chain to ensure the new parentId
 * doesn't create a cycle.
 *
 * @param db - Database instance
 * @param categoryId - The category being updated
 * @param newParentId - The proposed new parent ID
 * @returns True if setting this parent would create a cycle
 */
export async function wouldCreateCycle(
  db: Database,
  categoryId: string,
  newParentId: string
): Promise<boolean> {
  // Cannot be your own parent
  if (categoryId === newParentId) {
    return true;
  }

  // Traverse up the parent chain from newParentId
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // Already visited - shouldn't happen but safety check
      return true;
    }
    visited.add(currentId);

    if (currentId === categoryId) {
      // Found the category in the parent chain - would create cycle
      return true;
    }

    // Get parent of current
    const [current] = await db
      .select({ parentId: kbCategories.parentId })
      .from(kbCategories)
      .where(eq(kbCategories.id, currentId))
      .limit(1);

    currentId = current?.parentId ?? null;
  }

  return false;
}

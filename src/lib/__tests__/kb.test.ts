/**
 * Unit Tests for Knowledge Base Helper Functions
 *
 * Tests utility functions for:
 * - Slug generation and uniqueness
 * - Category tree building
 * - Article count updates
 * - Circular reference detection
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateSlug,
  ensureUniqueSlug,
  buildCategoryTree,
  updateArticleCount,
  hasChildCategories,
  wouldCreateCycle,
} from "../kb";
import type { KBCategory } from "@/db/schema";

// =============================================================================
// SLUG GENERATION TESTS
// =============================================================================

describe("generateSlug", () => {
  it("should convert title to lowercase slug", () => {
    const result = generateSlug("Hello World");
    expect(result).toBe("hello-world");
  });

  it("should replace spaces with hyphens", () => {
    const result = generateSlug("Getting Started Guide");
    expect(result).toBe("getting-started-guide");
  });

  it("should remove special characters", () => {
    const result = generateSlug("API & Integration (2024)!");
    expect(result).toBe("api-integration-2024");
  });

  it("should handle multiple consecutive spaces", () => {
    const result = generateSlug("Multiple    Spaces   Here");
    expect(result).toBe("multiple-spaces-here");
  });

  it("should trim leading and trailing spaces", () => {
    const result = generateSlug("  Leading and Trailing  ");
    expect(result).toBe("leading-and-trailing");
  });

  it("should handle unicode characters by removing them", () => {
    const result = generateSlug("Test 中文 Title");
    expect(result).toBe("test-title");
  });

  it("should handle empty string", () => {
    const result = generateSlug("");
    expect(result).toBe("");
  });

  it("should handle string with only special characters", () => {
    const result = generateSlug("@#$%^&*()");
    expect(result).toBe("");
  });

  it("should handle hyphenated words", () => {
    const result = generateSlug("End-to-End Testing");
    expect(result).toBe("end-to-end-testing");
  });

  it("should replace multiple consecutive hyphens with single hyphen", () => {
    const result = generateSlug("Test -- Multiple --- Hyphens");
    expect(result).toBe("test-multiple-hyphens");
  });
});

// =============================================================================
// ENSURE UNIQUE SLUG TESTS
// =============================================================================

describe("ensureUniqueSlug", () => {
  it("should return original slug if unique", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // No existing slug
    };

    const result = await ensureUniqueSlug(
      mockDb as any,
      "categories",
      "unique-slug"
    );

    expect(result).toBe("unique-slug");
  });

  it("should append -1 if slug exists", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ id: "existing" }]) // First slug exists
        .mockResolvedValueOnce([]), // Second slug is unique
    };

    const result = await ensureUniqueSlug(
      mockDb as any,
      "categories",
      "existing-slug"
    );

    expect(result).toBe("existing-slug-1");
  });

  it("should append -2 if slug-1 exists", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ id: "existing" }]) // slug exists
        .mockResolvedValueOnce([{ id: "existing-1" }]) // slug-1 exists
        .mockResolvedValueOnce([]), // slug-2 is unique
    };

    const result = await ensureUniqueSlug(
      mockDb as any,
      "categories",
      "existing-slug"
    );

    expect(result).toBe("existing-slug-2");
  });

  it("should exclude current item when checking for duplicates", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // No other slug exists
    };

    const result = await ensureUniqueSlug(
      mockDb as any,
      "categories",
      "my-slug",
      "current-id"
    );

    expect(result).toBe("my-slug");
  });

  it("should throw error after 100 attempts", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "existing" }]), // Always exists
    };

    await expect(
      ensureUniqueSlug(mockDb as any, "categories", "slug")
    ).rejects.toThrow("Unable to generate unique slug after 100 attempts");
  });

  it("should work with different table types", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    await ensureUniqueSlug(mockDb as any, "tags", "tag-slug");
    await ensureUniqueSlug(mockDb as any, "articles", "article-slug");

    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// BUILD CATEGORY TREE TESTS
// =============================================================================

describe("buildCategoryTree", () => {
  it("should return empty array for empty input", () => {
    const result = buildCategoryTree([]);
    expect(result).toEqual([]);
  });

  it("should handle flat categories with no parents", () => {
    const categories: KBCategory[] = [
      {
        id: "1",
        name: "Category A",
        slug: "category-a",
        description: null,
        parentId: null,
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name: "Category B",
        slug: "category-b",
        description: null,
        parentId: null,
        sortOrder: 1,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = buildCategoryTree(categories);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[0].children).toEqual([]);
    expect(result[1].id).toBe("2");
    expect(result[1].children).toEqual([]);
  });

  it("should nest children under parents", () => {
    const categories: KBCategory[] = [
      {
        id: "parent",
        name: "Parent",
        slug: "parent",
        description: null,
        parentId: null,
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "child",
        name: "Child",
        slug: "child",
        description: null,
        parentId: "parent",
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = buildCategoryTree(categories);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("parent");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe("child");
  });

  it("should handle multiple levels of nesting", () => {
    const categories: KBCategory[] = [
      {
        id: "grandparent",
        name: "Grandparent",
        slug: "grandparent",
        description: null,
        parentId: null,
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "parent",
        name: "Parent",
        slug: "parent",
        description: null,
        parentId: "grandparent",
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "child",
        name: "Child",
        slug: "child",
        description: null,
        parentId: "parent",
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = buildCategoryTree(categories);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("grandparent");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe("parent");
    expect(result[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].id).toBe("child");
  });

  it("should sort by sortOrder then by name", () => {
    const categories: KBCategory[] = [
      {
        id: "3",
        name: "Zebra",
        slug: "zebra",
        description: null,
        parentId: null,
        sortOrder: 2,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "1",
        name: "Apple",
        slug: "apple",
        description: null,
        parentId: null,
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name: "Banana",
        slug: "banana",
        description: null,
        parentId: null,
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = buildCategoryTree(categories);

    // First by sortOrder (0, 0, 2), then alphabetically (Apple, Banana, Zebra)
    expect(result[0].id).toBe("1"); // Apple (sortOrder 0)
    expect(result[1].id).toBe("2"); // Banana (sortOrder 0)
    expect(result[2].id).toBe("3"); // Zebra (sortOrder 2)
  });

  it("should handle orphaned categories with invalid parentId", () => {
    const categories: KBCategory[] = [
      {
        id: "orphan",
        name: "Orphan",
        slug: "orphan",
        description: null,
        parentId: "nonexistent",
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = buildCategoryTree(categories);

    // Orphan should be treated as root-level
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("orphan");
    expect(result[0].children).toEqual([]);
  });

  it("should sort children at each level independently", () => {
    const categories: KBCategory[] = [
      {
        id: "parent",
        name: "Parent",
        slug: "parent",
        description: null,
        parentId: null,
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "child-z",
        name: "Child Z",
        slug: "child-z",
        description: null,
        parentId: "parent",
        sortOrder: 1,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "child-a",
        name: "Child A",
        slug: "child-a",
        description: null,
        parentId: "parent",
        sortOrder: 0,
        articleCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = buildCategoryTree(categories);

    expect(result[0].children[0].id).toBe("child-a");
    expect(result[0].children[1].id).toBe("child-z");
  });
});

// =============================================================================
// ARTICLE COUNT UPDATE TESTS
// =============================================================================

describe("updateArticleCount", () => {
  it("should update category article count", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 5 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ results: [{ count: 3 }] }),
    };

    await updateArticleCount(mockDb as any, "category", "cat-123");

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ articleCount: 5 })
    );
  });

  it("should handle zero article count for category", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };

    await updateArticleCount(mockDb as any, "category", "empty-cat");

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ articleCount: 0 })
    );
  });

  it("should update tag article count", async () => {
    const mockDb = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ results: [{ count: 3 }] }),
    };

    await updateArticleCount(mockDb as any, "tag", "tag-123");

    expect(mockDb.run).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should handle zero count when no results from count query", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ results: [] }),
    };

    await updateArticleCount(mockDb as any, "category", "cat-id");

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ articleCount: 0 })
    );
  });
});

// =============================================================================
// HAS CHILD CATEGORIES TESTS
// =============================================================================

describe("hasChildCategories", () => {
  it("should return true when category has children", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "child-id" }]),
    };

    const result = await hasChildCategories(mockDb as any, "parent-id");

    expect(result).toBe(true);
  });

  it("should return false when category has no children", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const result = await hasChildCategories(mockDb as any, "parent-id");

    expect(result).toBe(false);
  });
});

// =============================================================================
// CIRCULAR REFERENCE DETECTION TESTS
// =============================================================================

describe("wouldCreateCycle", () => {
  it("should detect when category would be its own parent", async () => {
    const mockDb = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };

    const result = await wouldCreateCycle(mockDb as any, "cat-1", "cat-1");

    expect(result).toBe(true);
  });

  it("should detect direct circular reference", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ parentId: "cat-1" }]) // cat-2's parent is cat-1
        .mockResolvedValueOnce([{ parentId: null }]), // cat-1 has no parent
    };

    // Trying to set cat-1's parent to cat-2 (cat-2's parent is already cat-1)
    const result = await wouldCreateCycle(mockDb as any, "cat-1", "cat-2");

    expect(result).toBe(true);
  });

  it("should detect indirect circular reference", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ parentId: "cat-2" }]) // cat-3's parent is cat-2
        .mockResolvedValueOnce([{ parentId: "cat-1" }]) // cat-2's parent is cat-1
        .mockResolvedValueOnce([{ parentId: null }]), // cat-1 has no parent
    };

    // Trying to set cat-1's parent to cat-3 (chain: cat-3 -> cat-2 -> cat-1)
    const result = await wouldCreateCycle(mockDb as any, "cat-1", "cat-3");

    expect(result).toBe(true);
  });

  it("should return false for valid parent-child relationship", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ parentId: null }]), // New parent has no parent
    };

    const result = await wouldCreateCycle(mockDb as any, "cat-1", "cat-2");

    expect(result).toBe(false);
  });

  it("should handle complex valid hierarchy", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ parentId: "other-1" }])
        .mockResolvedValueOnce([{ parentId: "other-2" }])
        .mockResolvedValueOnce([{ parentId: null }]),
    };

    // Valid: cat-new wants parent cat-x, and cat-x's chain doesn't include cat-new
    const result = await wouldCreateCycle(mockDb as any, "cat-new", "cat-x");

    expect(result).toBe(false);
  });

  it("should handle parent chain that ends in null", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ parentId: "grandparent" }])
        .mockResolvedValueOnce([{ parentId: null }]),
    };

    const result = await wouldCreateCycle(mockDb as any, "child", "parent");

    expect(result).toBe(false);
  });

  it("should detect cycle when category is in the middle of chain", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([{ parentId: "cat-3" }]) // cat-4 -> cat-3
        .mockResolvedValueOnce([{ parentId: "cat-2" }]) // cat-3 -> cat-2
        .mockResolvedValueOnce([{ parentId: "cat-1" }]) // cat-2 -> cat-1
        .mockResolvedValueOnce([{ parentId: null }]), // cat-1 -> null
    };

    // Trying to set cat-2's parent to cat-4 (chain: cat-4 -> cat-3 -> cat-2)
    const result = await wouldCreateCycle(mockDb as any, "cat-2", "cat-4");

    expect(result).toBe(true);
  });
});

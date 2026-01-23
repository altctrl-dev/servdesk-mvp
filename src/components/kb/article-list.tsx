"use client";

/**
 * Article List Component
 *
 * Client component for listing KB articles with:
 * - Search input
 * - Status filter dropdown
 * - Category filter dropdown
 * - Article card grid
 * - Pagination
 * - Loading and empty states
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleCard, type ArticleListItem } from "./article-card";
import { Search, FileText, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import type { KBArticleStatus } from "@/db/schema";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ArticleListProps {
  initialStatus?: KBArticleStatus;
  showDraftsOnly?: boolean;
  canEdit: boolean;
  canPublish: boolean;
}

interface ArticleListResponse {
  articles: ArticleListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface CategoriesResponse {
  categories: Category[];
}

const ITEMS_PER_PAGE = 12;

export function ArticleList({
  initialStatus,
  showDraftsOnly = false,
  canEdit,
  canPublish,
}: ArticleListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Filter state from URL params
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = (searchParams.get("status") as KBArticleStatus) || initialStatus || "";
  const currentCategoryId = searchParams.get("categoryId") || "";

  // Debounced search
  const [searchInput, setSearchInput] = useState(currentSearch);

  /**
   * Update URL params without navigation
   */
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      // Reset to page 1 when filters change
      if (!("page" in updates)) {
        params.set("page", "1");
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  /**
   * Fetch categories
   */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/kb/categories?flat=true");
        if (!response.ok) throw new Error("Failed to fetch categories");
        const data: CategoriesResponse = await response.json();
        setCategories(data.categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  /**
   * Fetch articles
   */
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", ITEMS_PER_PAGE.toString());

      if (showDraftsOnly) {
        params.set("status", "DRAFT");
      } else if (currentStatus) {
        params.set("status", currentStatus);
      }

      if (currentSearch) {
        params.set("search", currentSearch);
      }

      if (currentCategoryId) {
        params.set("categoryId", currentCategoryId);
      }

      const response = await fetch(`/api/kb/articles?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch articles");

      const data: ArticleListResponse = await response.json();
      setArticles(data.articles);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, currentCategoryId, showDraftsOnly]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  /**
   * Debounce search input
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateParams({ search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, currentSearch, updateParams]);

  /**
   * Handle status change
   */
  const handleStatusChange = async (articleId: string, newStatus: KBArticleStatus) => {
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to update article");
      }

      toast.success(`Article ${newStatus.toLowerCase()}`);
      fetchArticles();
    } catch (error) {
      console.error("Error updating article:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update article");
    }
  };

  /**
   * Handle delete (archive)
   */
  const handleDelete = async (articleId: string) => {
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete article");
      }

      toast.success("Article archived");
      fetchArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete article");
    }
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchInput("");
    router.push("?page=1", { scroll: false });
  };

  const hasActiveFilters = currentSearch || currentStatus || currentCategoryId;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter (only if not showing drafts only) */}
        {!showDraftsOnly && (
          <Select
            value={currentStatus}
            onValueChange={(value) => updateParams({ status: value === "ALL" ? "" : value })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Category filter */}
        <Select
          value={currentCategoryId}
          onValueChange={(value) =>
            updateParams({ categoryId: value === "ALL" ? "" : value })
          }
          disabled={isLoadingCategories}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          {total} {total === 1 ? "article" : "articles"} found
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading articles..." />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasActiveFilters ? "No articles match your filters" : "No articles yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Create your first knowledge base article to get started"
          }
          action={
            hasActiveFilters
              ? { label: "Clear Filters", onClick: clearFilters }
              : undefined
          }
        />
      ) : (
        <>
          {/* Article grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                canEdit={canEdit}
                canPublish={canPublish}
                onStatusChange={canPublish ? handleStatusChange : undefined}
                onDelete={canEdit ? handleDelete : undefined}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: (currentPage - 1).toString() })}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

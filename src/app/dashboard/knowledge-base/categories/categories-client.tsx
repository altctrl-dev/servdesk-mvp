"use client";

/**
 * Categories Client Component
 *
 * Client component for managing KB categories.
 * Fetches categories in tree structure and renders the CategoryTree component.
 */

import { useState, useEffect, useCallback } from "react";
import { CategoryTree, type CategoryWithChildren } from "@/components/kb";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface CategoriesResponse {
  tree: CategoryWithChildren[];
}

export function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch categories in tree structure
   */
  const fetchCategories = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/kb/categories?flat=false");

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to fetch categories");
      }

      const data: CategoriesResponse = await response.json();
      setCategories(data.tree || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      const message = error instanceof Error ? error.message : "Failed to load categories";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (isLoading) {
    return <LoadingState message="Loading categories..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Failed to load categories"
        description={error}
        action={{
          label: "Try Again",
          onClick: () => {
            setIsLoading(true);
            fetchCategories();
          },
        }}
      />
    );
  }

  return <CategoryTree categories={categories} onRefresh={fetchCategories} />;
}

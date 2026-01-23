"use client";

/**
 * Tags Client Component
 *
 * Client component for managing KB tags.
 * Fetches tags and renders the TagManager component.
 */

import { useState, useEffect, useCallback } from "react";
import { TagManager, type TagItem } from "@/components/kb";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Tags } from "lucide-react";
import { toast } from "sonner";

interface TagsResponse {
  tags: TagItem[];
}

export function TagsClient() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tags
   */
  const fetchTags = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/kb/tags");

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to fetch tags");
      }

      const data: TagsResponse = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      const message = error instanceof Error ? error.message : "Failed to load tags";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  if (isLoading) {
    return <LoadingState message="Loading tags..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Tags}
        title="Failed to load tags"
        description={error}
        action={{
          label: "Try Again",
          onClick: () => {
            setIsLoading(true);
            fetchTags();
          },
        }}
      />
    );
  }

  return <TagManager tags={tags} onRefresh={fetchTags} />;
}

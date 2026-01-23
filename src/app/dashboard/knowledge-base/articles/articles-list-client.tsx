"use client";

/**
 * Articles List Client Component
 *
 * Client component wrapper for the ArticleList component.
 * Handles URL query params for filters.
 */

import { Suspense } from "react";
import { ArticleList } from "@/components/kb";
import { LoadingState } from "@/components/ui/loading-state";

interface ArticlesListClientProps {
  canEdit: boolean;
  canPublish: boolean;
}

export function ArticlesListClient({ canEdit, canPublish }: ArticlesListClientProps) {
  return (
    <Suspense fallback={<LoadingState message="Loading articles..." />}>
      <ArticleList canEdit={canEdit} canPublish={canPublish} />
    </Suspense>
  );
}

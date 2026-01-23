"use client";

/**
 * Drafts List Client Component
 *
 * Client component wrapper for the ArticleList component.
 * Preset to show only DRAFT articles.
 */

import { Suspense } from "react";
import { ArticleList } from "@/components/kb";
import { LoadingState } from "@/components/ui/loading-state";

interface DraftsListClientProps {
  canEdit: boolean;
  canPublish: boolean;
}

export function DraftsListClient({ canEdit, canPublish }: DraftsListClientProps) {
  return (
    <Suspense fallback={<LoadingState message="Loading drafts..." />}>
      <ArticleList
        showDraftsOnly
        canEdit={canEdit}
        canPublish={canPublish}
      />
    </Suspense>
  );
}

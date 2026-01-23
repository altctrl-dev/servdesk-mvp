/**
 * Article Status Badge Component
 *
 * Displays KB article status with appropriate colors:
 * - DRAFT: yellow/amber
 * - PUBLISHED: green
 * - ARCHIVED: gray
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { KBArticleStatus } from "@/db/schema";

interface ArticleStatusBadgeProps {
  status: KBArticleStatus;
  className?: string;
  size?: "sm" | "default";
}

/** Human-readable status labels */
const STATUS_LABELS: Record<KBArticleStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/** Status-specific styles */
const STATUS_STYLES: Record<KBArticleStatus, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  PUBLISHED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  ARCHIVED: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

export function ArticleStatusBadge({
  status,
  className,
  size = "default",
}: ArticleStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        STATUS_STYLES[status],
        size === "sm" && "text-xs px-2 py-0.5",
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export { STATUS_LABELS as ARTICLE_STATUS_LABELS };

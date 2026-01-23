"use client";

/**
 * Article Card Component
 *
 * Displays a summary card for a KB article including:
 * - Title (linked to detail page)
 * - Excerpt (truncated)
 * - Status, category, and tag badges
 * - Author, view count, and date
 * - Action buttons based on permissions
 */

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArticleStatusBadge } from "./article-status-badge";
import {
  Eye,
  Pencil,
  MoreVertical,
  Archive,
  Send,
  Undo2,
  Trash2,
  User,
  Loader2,
  FolderOpen,
  Tag,
} from "lucide-react";
import type { KBArticleStatus } from "@/db/schema";

/** Type for article list item */
export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: KBArticleStatus;
  categoryId: string | null;
  categoryName: string | null;
  tagNames: string;
  authorId: string;
  authorName: string;
  viewCount: number;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface ArticleCardProps {
  article: ArticleListItem;
  canEdit: boolean;
  canPublish: boolean;
  onStatusChange?: (articleId: string, newStatus: KBArticleStatus) => Promise<void>;
  onDelete?: (articleId: string) => Promise<void>;
}

/**
 * Format Unix timestamp to readable date
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format view count with K/M suffix
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function ArticleCard({
  article,
  canEdit,
  canPublish,
  onStatusChange,
  onDelete,
}: ArticleCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: KBArticleStatus) => {
    if (!onStatusChange || isUpdating) return;
    setIsUpdating(true);
    setActionInProgress(newStatus);
    try {
      await onStatusChange(article.id, newStatus);
    } finally {
      setIsUpdating(false);
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isUpdating) return;
    setIsUpdating(true);
    setActionInProgress("delete");
    try {
      await onDelete(article.id);
    } finally {
      setIsUpdating(false);
      setActionInProgress(null);
    }
  };

  const tags = article.tagNames ? article.tagNames.split(", ").filter(Boolean) : [];
  const displayDate = article.publishedAt
    ? formatDate(article.publishedAt)
    : formatDate(article.createdAt);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/knowledge-base/articles/${article.id}`}
              className="hover:underline"
            >
              <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
            </Link>
          </div>
          <ArticleStatusBadge status={article.status} size="sm" />
        </div>
        {article.excerpt && (
          <CardDescription className="mt-2 line-clamp-2">
            {article.excerpt}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {/* Category and tags */}
        <div className="flex flex-wrap gap-2">
          {article.categoryName && (
            <Badge variant="secondary" className="text-xs">
              <FolderOpen className="h-3 w-3 mr-1" />
              {article.categoryName}
            </Badge>
          )}
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3} more
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{article.authorName}</span>
          </div>
          <span>|</span>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{formatViewCount(article.viewCount)} views</span>
          </div>
          <span>|</span>
          <span>{displayDate}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {/* View button */}
        <Link
          href={`/dashboard/knowledge-base/articles/${article.id}`}
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </Link>

        {/* Edit button (SUPERVISOR+) */}
        {canEdit && (
          <Link href={`/dashboard/knowledge-base/articles/${article.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </Link>
        )}

        {/* Actions dropdown (ADMIN+ for status changes) */}
        {(canPublish || canEdit) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Publish action (ADMIN+ only, for DRAFT articles) */}
              {canPublish && article.status === "DRAFT" && onStatusChange && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("PUBLISHED")}
                  disabled={actionInProgress === "PUBLISHED"}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}

              {/* Unpublish/Archive action (ADMIN+ only, for PUBLISHED articles) */}
              {canPublish && article.status === "PUBLISHED" && onStatusChange && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("ARCHIVED")}
                  disabled={actionInProgress === "ARCHIVED"}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}

              {/* Restore to Draft (ADMIN+ only, for ARCHIVED articles) */}
              {canPublish && article.status === "ARCHIVED" && onStatusChange && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("DRAFT")}
                  disabled={actionInProgress === "DRAFT"}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Restore to Draft
                </DropdownMenuItem>
              )}

              {/* Delete action (soft delete = archive for SUPERVISOR+) */}
              {canEdit && article.status !== "ARCHIVED" && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Article</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{article.title}&quot;?
                          This will archive the article.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}

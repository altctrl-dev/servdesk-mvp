"use client";

/**
 * Article Detail Client Component
 *
 * Displays full article content with:
 * - Title and content
 * - Metadata panel (status, category, tags, author, dates, views)
 * - Edit button (SUPERVISOR+)
 * - Publish/Archive buttons (ADMIN+)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleStatusBadge } from "@/components/kb";
import {
  Pencil,
  Send,
  Archive,
  Undo2,
  ArrowLeft,
  User,
  Calendar,
  Eye,
  FolderOpen,
  Tag,
  Loader2,
  FileX,
} from "lucide-react";
import { toast } from "sonner";
import type { KBArticleStatus } from "@/db/schema";

interface ArticleTag {
  id: string;
  name: string;
  slug: string;
}

interface ArticleDetail {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: KBArticleStatus;
  categoryId: string | null;
  categoryName: string | null;
  tags: ArticleTag[];
  authorId: string;
  authorName: string;
  authorEmail: string;
  viewCount: number;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface ArticleDetailClientProps {
  articleId: string;
  canEdit: boolean;
  canPublish: boolean;
}

/**
 * Format Unix timestamp to readable date
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ArticleDetailClient({
  articleId,
  canEdit,
  canPublish,
}: ArticleDetailClientProps) {
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch article
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/kb/articles/${articleId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Article not found");
          } else {
            const data = (await response.json()) as { error?: string };
            throw new Error(data.error || "Failed to load article");
          }
          return;
        }
        const data = (await response.json()) as { article: ArticleDetail };
        setArticle(data.article);
      } catch (err) {
        console.error("Error fetching article:", err);
        setError(err instanceof Error ? err.message : "Failed to load article");
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();
  }, [articleId]);

  /**
   * Handle status change
   */
  const handleStatusChange = async (newStatus: KBArticleStatus) => {
    if (!article || isUpdating) return;
    setIsUpdating(true);
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

      const data = (await response.json()) as { article: { status: KBArticleStatus } };
      setArticle({ ...article, status: data.article.status });
      toast.success(`Article ${newStatus.toLowerCase()}`);
    } catch (err) {
      console.error("Error updating article:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update article");
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle delete (archive)
   */
  const handleDelete = async () => {
    if (!article || isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete article");
      }

      toast.success("Article archived");
      router.push("/dashboard/knowledge-base/articles");
    } catch (err) {
      console.error("Error deleting article:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete article");
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading article..." fullPage />;
  }

  if (error || !article) {
    return (
      <EmptyState
        icon={FileX}
        title="Article Not Found"
        description={error || "The article you're looking for doesn't exist or you don't have permission to view it."}
      >
        <Link href="/dashboard/knowledge-base/articles">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={article.title}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/knowledge-base/articles">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>

            {/* Edit button (SUPERVISOR+) */}
            {canEdit && (
              <Link href={`/dashboard/knowledge-base/articles/${articleId}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}

            {/* Publish button (ADMIN+ only, for DRAFT articles) */}
            {canPublish && article.status === "DRAFT" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("PUBLISHED")}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Publish
              </Button>
            )}

            {/* Archive button (ADMIN+ only, for PUBLISHED articles) */}
            {canPublish && article.status === "PUBLISHED" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4 mr-2" />
                    )}
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Article</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive this article? It will no longer
                      be visible to users.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange("ARCHIVED")}>
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Restore to Draft (ADMIN+ only, for ARCHIVED articles) */}
            {canPublish && article.status === "ARCHIVED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("DRAFT")}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4 mr-2" />
                )}
                Restore to Draft
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-lg text-muted-foreground mb-6 italic">
                  {article.excerpt}
                </p>
              )}

              {/* Content - rendered as preformatted text for MVP */}
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                  {article.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          {/* Status card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ArticleStatusBadge status={article.status} />
            </CardContent>
          </Card>

          {/* Category card */}
          {article.categoryName && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{article.categoryName}</Badge>
              </CardContent>
            </Card>
          )}

          {/* Tags card */}
          {article.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Author */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Author:</span>
                <span>{article.authorName}</span>
              </div>

              {/* View count */}
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Views:</span>
                <span>{article.viewCount.toLocaleString()}</span>
              </div>

              <Separator />

              {/* Published date */}
              {article.publishedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Published:</span>
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
              )}

              {/* Created date */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(article.createdAt)}</span>
              </div>

              {/* Updated date */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span>{formatDate(article.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delete action (SUPERVISOR+) */}
          {canEdit && article.status !== "ARCHIVED" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  disabled={isUpdating}
                >
                  Delete Article
                </Button>
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
          )}
        </div>
      </div>
    </div>
  );
}

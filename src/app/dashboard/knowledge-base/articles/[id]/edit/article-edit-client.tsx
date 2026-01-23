"use client";

/**
 * Article Edit Client Component
 *
 * Client component for editing an existing article.
 * Fetches article data and handles form submission.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleForm, type ArticleFormData } from "@/components/kb";
import { ArrowLeft, FileX } from "lucide-react";
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
  viewCount: number;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface ArticleEditClientProps {
  articleId: string;
}

export function ArticleEditClient({ articleId }: ArticleEditClientProps) {
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (data: ArticleFormData) => {
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Failed to update article");
      }

      toast.success("Article updated successfully");
      router.push(`/dashboard/knowledge-base/articles/${articleId}`);
    } catch (err) {
      console.error("Error updating article:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update article");
      throw err; // Re-throw to keep the form in submitting state
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/knowledge-base/articles/${articleId}`);
  };

  if (isLoading) {
    return <LoadingState message="Loading article..." fullPage />;
  }

  if (error || !article) {
    return (
      <EmptyState
        icon={FileX}
        title="Article Not Found"
        description={error || "The article you're looking for doesn't exist or you don't have permission to edit it."}
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
      <PageHeader
        title="Edit Article"
        description={article.title}
        actions={
          <Link href={`/dashboard/knowledge-base/articles/${articleId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Article
            </Button>
          </Link>
        }
      />

      <div className="max-w-3xl">
        <Card>
          <CardContent className="pt-6">
            <ArticleForm
              article={article}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel="Save Changes"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

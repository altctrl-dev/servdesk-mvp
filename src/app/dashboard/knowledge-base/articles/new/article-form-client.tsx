"use client";

/**
 * Article Form Client Component
 *
 * Client component for creating a new article.
 * Handles form submission and redirect on success.
 */

import { useRouter } from "next/navigation";
import { ArticleForm, type ArticleFormData } from "@/components/kb";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface CreateArticleResponse {
  article: {
    id: string;
    title: string;
    slug: string;
  };
  message: string;
}

export function ArticleFormClient() {
  const router = useRouter();

  const handleSubmit = async (data: ArticleFormData) => {
    try {
      const response = await fetch("/api/kb/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Failed to create article");
      }

      const result: CreateArticleResponse = await response.json();
      toast.success("Article created successfully");
      router.push(`/dashboard/knowledge-base/articles/${result.article.id}`);
    } catch (error) {
      console.error("Error creating article:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create article");
      throw error; // Re-throw to keep the form in submitting state
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/knowledge-base/articles");
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <ArticleForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Article"
        />
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * Article Form Component
 *
 * Reusable form for creating and editing KB articles.
 * Includes:
 * - Title input (required)
 * - Content textarea (markdown, required)
 * - Excerpt textarea (optional)
 * - Category select dropdown
 * - Tags multi-select
 * - Submit button with loading state
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import type { KBArticle } from "@/db/schema";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleFormData {
  title: string;
  content: string;
  excerpt?: string;
  categoryId?: string;
  tagIds?: string[];
}

interface ArticleWithTags extends Omit<KBArticle, "publishedAt" | "createdAt" | "updatedAt"> {
  tags?: { id: string; name: string; slug: string }[];
  publishedAt?: number | Date | null;
  createdAt: number | Date;
  updatedAt: number | Date;
}

interface ArticleFormProps {
  article?: ArticleWithTags;
  onSubmit: (data: ArticleFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

interface CategoriesResponse {
  categories: Category[];
}

interface TagsResponse {
  tags: Tag[];
}

export function ArticleForm({
  article,
  onSubmit,
  onCancel,
  submitLabel = "Save Article",
}: ArticleFormProps) {
  // Form state
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [categoryId, setCategoryId] = useState(article?.categoryId || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    article?.tags?.map((t) => t.id) || []
  );

  // Options state
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories
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

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/kb/tags");
        if (!response.ok) throw new Error("Failed to fetch tags");
        const data: TagsResponse = await response.json();
        setTags(data.tags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      } finally {
        setIsLoadingTags(false);
      }
    };
    fetchTags();
  }, []);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 200) {
      newErrors.title = "Title must be 200 characters or less";
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
    }

    if (excerpt && excerpt.length > 500) {
      newErrors.excerpt = "Excerpt must be 500 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || undefined,
        categoryId: categoryId || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Toggle tag selection
   */
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  /**
   * Remove selected tag
   */
  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  // Get selected tag objects for display
  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = tags.filter((t) => !selectedTagIds.includes(t.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter article title"
          disabled={isSubmitting}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary of the article (optional)"
          rows={2}
          disabled={isSubmitting}
          aria-invalid={!!errors.excerpt}
          aria-describedby={errors.excerpt ? "excerpt-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          {excerpt.length}/500 characters
        </p>
        {errors.excerpt && (
          <p id="excerpt-error" className="text-sm text-destructive">
            {errors.excerpt}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">
          Content <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your article content here (Markdown supported)"
          rows={15}
          className="font-mono text-sm"
          disabled={isSubmitting}
          aria-invalid={!!errors.content}
          aria-describedby={errors.content ? "content-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Markdown formatting is supported
        </p>
        {errors.content && (
          <p id="content-error" className="text-sm text-destructive">
            {errors.content}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={categoryId}
          onValueChange={(value) => setCategoryId(value === "NONE" ? "" : value)}
          disabled={isSubmitting || isLoadingCategories}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">No category</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="pr-1">
                {tag.name}
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {tag.name}</span>
                </button>
              </Badge>
            ))}
          </div>
        )}
        {/* Available tags */}
        {!isLoadingTags && availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Button
                key={tag.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleTag(tag.id)}
                disabled={isSubmitting}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {tag.name}
              </Button>
            ))}
          </div>
        )}
        {isLoadingTags && (
          <p className="text-sm text-muted-foreground">Loading tags...</p>
        )}
        {!isLoadingTags && tags.length === 0 && (
          <p className="text-sm text-muted-foreground">No tags available</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

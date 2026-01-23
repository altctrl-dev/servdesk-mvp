"use client";

/**
 * Tag Manager Component
 *
 * Tag management for KB articles:
 * - List all tags with article counts
 * - Search/filter tags
 * - Add new tag
 * - Edit tag name
 * - Delete tag (with confirmation)
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Tag,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Search,
  Tags,
} from "lucide-react";
import { toast } from "sonner";

/** Type for tag */
export interface TagItem {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
  createdAt: string;
}

interface TagManagerProps {
  tags: TagItem[];
  onRefresh: () => void;
}

interface TagRowProps {
  tag: TagItem;
  onRefresh: () => void;
}

/**
 * Single tag row with edit/delete actions
 */
function TagRow({ tag, onRefresh }: TagRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle edit save
   */
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    if (editName.trim() === tag.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/kb/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to update tag");
      }

      toast.success("Tag updated");
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update tag");
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/kb/tags/${tag.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete tag");
      }

      toast.success("Tag deleted");
      onRefresh();
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete tag");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      {/* Tag icon */}
      <Tag className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Name (editable or display) */}
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditName(tag.name);
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setIsEditing(false);
              setEditName(tag.name);
            }}
            disabled={isUpdating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{tag.name}</span>
          <Badge variant="secondary" className="text-xs">
            {tag.articleCount} {tag.articleCount === 1 ? "article" : "articles"}
          </Badge>
        </>
      )}

      {/* Actions (visible on hover) */}
      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsEditing(true)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{tag.name}&quot;?
                  {tag.articleCount > 0 && (
                    <>
                      {" "}
                      This will remove the tag from {tag.articleCount}{" "}
                      {tag.articleCount === 1 ? "article" : "articles"}.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export function TagManager({ tags, onRefresh }: TagManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Filter tags by search query
   */
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tags, searchQuery]);

  /**
   * Handle add new tag
   */
  const handleAdd = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/kb/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to create tag");
      }

      toast.success("Tag created");
      setNewTagName("");
      setIsAdding(false);
      onRefresh();
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tags</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add tag input */}
        {isAdding && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
            <Input
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-8 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewTagName("");
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleAdd}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setIsAdding(false);
                setNewTagName("");
              }}
              disabled={isCreating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Search input */}
        {tags.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Tags list */}
        {tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tags yet</p>
            <p className="text-sm">Create your first tag to label articles</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tags match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTags.map((tag) => (
              <TagRow key={tag.id} tag={tag} onRefresh={onRefresh} />
            ))}
          </div>
        )}

        {/* Total count */}
        {tags.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {filteredTags.length} of {tags.length} tags
          </div>
        )}
      </CardContent>
    </Card>
  );
}

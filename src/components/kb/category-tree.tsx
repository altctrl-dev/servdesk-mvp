"use client";

/**
 * Category Tree Component
 *
 * Hierarchical tree view for managing KB categories:
 * - Tree structure with expand/collapse
 * - Article count per category
 * - Actions: Edit, Delete, Add subcategory
 * - Add new root category option
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Type for category with children (tree structure) */
export interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
  children: CategoryWithChildren[];
}

interface CategoryTreeProps {
  categories: CategoryWithChildren[];
  onRefresh: () => void;
}

interface CategoryNodeProps {
  category: CategoryWithChildren;
  level: number;
  onRefresh: () => void;
}

/**
 * Single category node with expand/collapse and actions
 */
function CategoryNode({ category, level, onRefresh }: CategoryNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [isCreatingChild, setIsCreatingChild] = useState(false);

  const hasChildren = category.children.length > 0;

  /**
   * Handle edit save
   */
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (editName.trim() === category.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/kb/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to update category");
      }

      toast.success("Category updated");
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update category");
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
      const response = await fetch(`/api/kb/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete category");
      }

      toast.success("Category deleted");
      onRefresh();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle add child category
   */
  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsCreatingChild(true);
    try {
      const response = await fetch("/api/kb/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChildName.trim(),
          parentId: category.id,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to create category");
      }

      toast.success("Subcategory created");
      setNewChildName("");
      setIsAddingChild(false);
      setIsOpen(true);
      onRefresh();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create category");
    } finally {
      setIsCreatingChild(false);
    }
  };

  return (
    <div className="select-none">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            "group flex items-center gap-2 rounded-md py-2 px-3 hover:bg-muted/50 transition-colors",
            level > 0 && "ml-6"
          )}
        >
          {/* Expand/Collapse trigger */}
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <span className="h-6 w-6" />
          )}

          {/* Folder icon */}
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />

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
                    setEditName(category.name);
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
                  setEditName(category.name);
                }}
                disabled={isUpdating}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground">
                {category.articleCount} {category.articleCount === 1 ? "article" : "articles"}
              </span>
            </>
          )}

          {/* Actions (visible on hover) */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsAddingChild(true)}
                title="Add subcategory"
              >
                <Plus className="h-4 w-4" />
              </Button>
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
                    disabled={hasChildren}
                    title={hasChildren ? "Delete children first" : "Delete"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{category.name}&quot;?
                      {category.articleCount > 0 && (
                        <>
                          {" "}
                          This will remove the category from {category.articleCount}{" "}
                          {category.articleCount === 1 ? "article" : "articles"}.
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

        {/* Add child input */}
        {isAddingChild && (
          <div className={cn("flex items-center gap-2 py-2 px-3", level > 0 ? "ml-12" : "ml-6")}>
            <Input
              placeholder="New subcategory name"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              className="h-7 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddChild();
                if (e.key === "Escape") {
                  setIsAddingChild(false);
                  setNewChildName("");
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleAddChild}
              disabled={isCreatingChild}
            >
              {isCreatingChild ? (
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
                setIsAddingChild(false);
                setNewChildName("");
              }}
              disabled={isCreatingChild}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent>
            {category.children.map((child) => (
              <CategoryNode
                key={child.id}
                category={child}
                level={level + 1}
                onRefresh={onRefresh}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function CategoryTree({ categories, onRefresh }: CategoryTreeProps) {
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);

  /**
   * Handle add root category
   */
  const handleAddRoot = async () => {
    if (!newRootName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsCreatingRoot(true);
    try {
      const response = await fetch("/api/kb/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRootName.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to create category");
      }

      toast.success("Category created");
      setNewRootName("");
      setIsAddingRoot(false);
      onRefresh();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create category");
    } finally {
      setIsCreatingRoot(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Category Structure</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingRoot(true)}
            disabled={isAddingRoot}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add root category input */}
        {isAddingRoot && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-md">
            <Input
              placeholder="New category name"
              value={newRootName}
              onChange={(e) => setNewRootName(e.target.value)}
              className="h-8 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddRoot();
                if (e.key === "Escape") {
                  setIsAddingRoot(false);
                  setNewRootName("");
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleAddRoot}
              disabled={isCreatingRoot}
            >
              {isCreatingRoot ? (
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
                setIsAddingRoot(false);
                setNewRootName("");
              }}
              disabled={isCreatingRoot}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Category tree */}
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No categories yet</p>
            <p className="text-sm">Create your first category to organize articles</p>
          </div>
        ) : (
          <div className="space-y-1">
            {categories.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                level={0}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

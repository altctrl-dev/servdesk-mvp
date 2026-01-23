"use client";

/**
 * My Views List Component
 *
 * Client component that displays the user's saved views
 * with actions for delete and set default.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ViewCard, type SavedViewData } from "@/components/admin/view-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Filter, AlertCircle } from "lucide-react";
import Link from "next/link";

interface MyViewsListProps {
  /** The current user's ID to determine ownership */
  userId: string;
}

export function MyViewsList({ userId }: MyViewsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch views on mount
  useEffect(() => {
    async function fetchViews() {
      try {
        const response = await fetch("/api/views");
        if (!response.ok) {
          throw new Error("Failed to fetch views");
        }
        const data = (await response.json()) as { views: SavedViewData[] };
        setViews(data.views || []);
      } catch (err) {
        console.error("Error fetching views:", err);
        setError("Failed to load your views. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchViews();
  }, []);

  const handleDelete = async (viewId: string) => {
    try {
      const response = await fetch(`/api/views/${viewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete view");
      }

      // Remove from local state
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      toast({
        title: "View deleted",
        description: "The view has been deleted successfully.",
      });
    } catch (err) {
      console.error("Error deleting view:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete view",
      });
    }
  };

  const handleSetDefault = async (viewId: string, isDefault: boolean) => {
    try {
      const response = await fetch(`/api/views/${viewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to update view");
      }

      // Update local state - set this view as default and unset others
      setViews((prev) =>
        prev.map((v) => ({
          ...v,
          isDefault: v.id === viewId ? isDefault : false,
        }))
      );

      toast({
        title: isDefault ? "Default view set" : "Default view removed",
        description: isDefault
          ? "This view is now your default view."
          : "This view is no longer your default view.",
      });

      // Refresh to ensure consistency
      router.refresh();
    } catch (err) {
      console.error("Error updating view:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update view",
      });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your views..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (views.length === 0) {
    return (
      <EmptyState
        icon={Filter}
        title="No saved views"
        description="Create a custom view to save your favorite filter combinations for quick access."
      >
        <Link href="/dashboard/views/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create View
          </Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex justify-end">
        <Link href="/dashboard/views/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create View
          </Button>
        </Link>
      </div>

      {/* Views grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {views.map((view) => (
          <ViewCard
            key={view.id}
            view={view}
            isOwner={view.userId === userId}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
        ))}
      </div>
    </div>
  );
}

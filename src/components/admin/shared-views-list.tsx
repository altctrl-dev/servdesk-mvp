"use client";

/**
 * Shared Views List Component
 *
 * Client component that displays views shared by other users.
 * These are read-only - users cannot edit or delete others' views.
 */

import { useState, useEffect } from "react";
import { ViewCard, type SavedViewData } from "@/components/admin/view-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Share2, AlertCircle } from "lucide-react";

interface SharedViewsListProps {
  /** The current user's ID to determine ownership */
  userId: string;
}

export function SharedViewsList({ userId }: SharedViewsListProps) {
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch shared views on mount
  useEffect(() => {
    async function fetchViews() {
      try {
        const response = await fetch("/api/views");
        if (!response.ok) {
          throw new Error("Failed to fetch views");
        }
        const data = (await response.json()) as { sharedViews: SavedViewData[] };
        setViews(data.sharedViews || []);
      } catch (err) {
        console.error("Error fetching shared views:", err);
        setError("Failed to load shared views. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchViews();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading shared views..." />;
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
        icon={Share2}
        title="No shared views"
        description="There are no views shared with the team yet. Supervisors and admins can share their views with the team."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {views.map((view) => (
        <ViewCard
          key={view.id}
          view={view}
          isOwner={view.userId === userId}
          showOwner={true}
        />
      ))}
    </div>
  );
}

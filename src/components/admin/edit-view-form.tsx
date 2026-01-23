"use client";

/**
 * Edit View Form Component
 *
 * Client component that handles view editing with the ViewFiltersForm.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ViewFiltersForm, type ViewFormData } from "./view-filters-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle } from "lucide-react";
import type { ViewFilters } from "@/db/schema";

/** Type for a saved view */
interface SavedView {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  filters: ViewFilters;
  isShared: boolean;
  isDefault: boolean;
}

interface EditViewFormProps {
  viewId: string;
  /** The current user's ID */
  userId: string;
  /** Whether the user can create shared views (SUPERVISOR+) */
  canShare: boolean;
}

export function EditViewForm({ viewId, userId, canShare }: EditViewFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<SavedView | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch view details
  useEffect(() => {
    async function fetchView() {
      try {
        const response = await fetch(`/api/views/${viewId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("View not found");
          }
          if (response.status === 403) {
            throw new Error("You do not have permission to edit this view");
          }
          throw new Error("Failed to fetch view");
        }
        const data = (await response.json()) as { view: SavedView };

        // Check ownership
        if (data.view.userId !== userId) {
          throw new Error("You can only edit your own views");
        }

        setView(data.view);
      } catch (err) {
        console.error("Error fetching view:", err);
        setError(err instanceof Error ? err.message : "Failed to load view");
      } finally {
        setIsLoadingView(false);
      }
    }
    fetchView();
  }, [viewId, userId]);

  const handleSubmit = async (data: ViewFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Build the request payload
      const payload = {
        name: data.name,
        description: data.description || null,
        filters: {
          status: data.status && data.status.length > 0 ? data.status : undefined,
          priority: data.priority && data.priority.length > 0 ? data.priority : undefined,
          assignedTo: data.assignedTo || undefined,
          search: data.search || undefined,
        },
        isShared: canShare ? (data.isShared || false) : undefined,
        isDefault: data.isDefault || false,
      };

      const response = await fetch(`/api/views/${viewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Failed to update view");
      }

      toast({
        title: "View updated",
        description: `"${data.name}" has been updated successfully.`,
      });

      // Redirect to views list
      router.push("/dashboard/views");
      router.refresh();
    } catch (err) {
      console.error("Error updating view:", err);
      setError(err instanceof Error ? err.message : "Failed to update view");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/views");
  };

  // Loading state
  if (isLoadingView) {
    return <LoadingState message="Loading view..." />;
  }

  // Error state
  if (error && !view) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/views">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Views
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // View not found
  if (!view) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/views">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Views
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>View not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit View</CardTitle>
      </CardHeader>
      <CardContent>
        <ViewFiltersForm
          initialValues={{
            name: view.name,
            description: view.description,
            filters: view.filters,
            isShared: view.isShared,
            isDefault: view.isDefault,
          }}
          canShare={canShare}
          isLoading={isSubmitting}
          error={error}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </CardContent>
    </Card>
  );
}

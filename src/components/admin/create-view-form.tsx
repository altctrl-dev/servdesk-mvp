"use client";

/**
 * Create View Form Component
 *
 * Client component that handles view creation with the ViewFiltersForm.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ViewFiltersForm, type ViewFormData } from "./view-filters-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreateViewFormProps {
  /** Whether the user can create shared views (SUPERVISOR+) */
  canShare: boolean;
}

export function CreateViewForm({ canShare }: CreateViewFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ViewFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Build the request payload
      const payload = {
        name: data.name,
        description: data.description || undefined,
        filters: {
          status: data.status && data.status.length > 0 ? data.status : undefined,
          priority: data.priority && data.priority.length > 0 ? data.priority : undefined,
          assignedTo: data.assignedTo || undefined,
          search: data.search || undefined,
        },
        isShared: data.isShared || false,
        isDefault: data.isDefault || false,
      };

      const response = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Failed to create view");
      }

      toast({
        title: "View created",
        description: `"${data.name}" has been created successfully.`,
      });

      // Redirect to views list
      router.push("/dashboard/views");
      router.refresh();
    } catch (err) {
      console.error("Error creating view:", err);
      setError(err instanceof Error ? err.message : "Failed to create view");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/views");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>View Details</CardTitle>
      </CardHeader>
      <CardContent>
        <ViewFiltersForm
          canShare={canShare}
          isLoading={isLoading}
          error={error}
          submitLabel="Create View"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </CardContent>
    </Card>
  );
}

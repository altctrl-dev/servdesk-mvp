"use client";

/**
 * Save View Dialog Component
 *
 * A dialog component that allows users to save their current filter
 * configuration as a named view directly from the ticket list.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TicketStatus, TicketPriority } from "@/db/schema";

interface SaveViewDialogProps {
  /** Dialog open state */
  open: boolean;
  /** State change handler */
  onOpenChange: (open: boolean) => void;
  /** Pre-filled filters from URL params */
  initialFilters: {
    status?: string;
    priority?: string;
    search?: string;
  };
  /** Whether user can create shared views (SUPERVISOR+) */
  canShare: boolean;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  initialFilters,
  canShare,
}: SaveViewDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);

    try {
      // Convert single filter values to arrays for the API
      // The ticket filters use single values but views support arrays
      const statusArray: TicketStatus[] | undefined =
        initialFilters.status && initialFilters.status !== "all"
          ? [initialFilters.status as TicketStatus]
          : undefined;

      const priorityArray: TicketPriority[] | undefined =
        initialFilters.priority && initialFilters.priority !== "all"
          ? [initialFilters.priority as TicketPriority]
          : undefined;

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        filters: {
          status: statusArray,
          priority: priorityArray,
          search: initialFilters.search || undefined,
        },
        isShared: canShare ? isShared : false,
        isDefault,
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
        title: "View saved",
        description: `"${name}" has been saved successfully.`,
      });

      // Reset form and close dialog
      resetForm();
      onOpenChange(false);

      // Refresh the page to update any view lists
      router.refresh();
    } catch (err) {
      console.error("Error saving view:", err);
      setError(err instanceof Error ? err.message : "Failed to save view");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsShared(false);
    setIsDefault(false);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Build a summary of the filters being saved
  const filterSummary = buildFilterSummary(initialFilters);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save as View</DialogTitle>
            <DialogDescription>
              Save your current filters as a reusable view.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Filter summary */}
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Filters to save:</p>
              <p className="text-muted-foreground">{filterSummary}</p>
            </div>

            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="view-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="view-name"
                placeholder="My Custom View"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Label htmlFor="view-description">Description</Label>
              <Textarea
                id="view-description"
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={2}
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Share with team - only show if user has permission */}
              {canShare && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view-shared"
                    checked={isShared}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      setIsShared(checked === true)
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="view-shared"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Share with team
                  </Label>
                </div>
              )}

              {/* Set as default */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view-default"
                  checked={isDefault}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setIsDefault(checked === true)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="view-default"
                  className="text-sm font-normal cursor-pointer"
                >
                  Set as my default view
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save View"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Build a human-readable summary of the filters being saved
 */
function buildFilterSummary(filters: {
  status?: string;
  priority?: string;
  search?: string;
}): string {
  const parts: string[] = [];

  if (filters.status && filters.status !== "all") {
    const statusLabels: Record<string, string> = {
      NEW: "New",
      OPEN: "Open",
      PENDING_CUSTOMER: "Pending",
      ON_HOLD: "On Hold",
      RESOLVED: "Resolved",
      CLOSED: "Closed",
    };
    parts.push(`Status: ${statusLabels[filters.status] || filters.status}`);
  }

  if (filters.priority && filters.priority !== "all") {
    const priorityLabels: Record<string, string> = {
      NORMAL: "Normal",
      HIGH: "High",
      URGENT: "Urgent",
    };
    parts.push(`Priority: ${priorityLabels[filters.priority] || filters.priority}`);
  }

  if (filters.search) {
    parts.push(`Search: "${filters.search}"`);
  }

  return parts.length > 0 ? parts.join(", ") : "No filters applied";
}

"use client";

/**
 * View Card Component
 *
 * Reusable card component for displaying a saved view.
 * Shows view name, description, filter badges, and actions.
 */

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Eye,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Share2,
  Loader2,
  User,
} from "lucide-react";
import type { ViewFilters, TicketStatus, TicketPriority } from "@/db/schema";

/** Type for a saved view */
export interface SavedViewData {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  filters: ViewFilters;
  columns: string[] | null;
  sortBy: string | null;
  sortOrder: string | null;
  isShared: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
  ownerEmail?: string;
}

interface ViewCardProps {
  view: SavedViewData;
  isOwner: boolean;
  onDelete?: (viewId: string) => Promise<void>;
  onSetDefault?: (viewId: string, isDefault: boolean) => Promise<void>;
  showOwner?: boolean;
}

/** Human-readable status labels */
const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING_CUSTOMER: "Pending",
  ON_HOLD: "On Hold",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** Human-readable priority labels */
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

/**
 * Format date to a readable string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ViewCard({
  view,
  isOwner,
  onDelete,
  onSetDefault,
  showOwner = false,
}: ViewCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(view.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async () => {
    if (!onSetDefault) return;
    setIsSettingDefault(true);
    try {
      await onSetDefault(view.id, !view.isDefault);
    } finally {
      setIsSettingDefault(false);
    }
  };

  const hasFilters =
    (view.filters.status && view.filters.status.length > 0) ||
    (view.filters.priority && view.filters.priority.length > 0) ||
    view.filters.assignedTo ||
    view.filters.search;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate">{view.name}</CardTitle>
              {view.isDefault && (
                <Badge variant="secondary" className="shrink-0">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
              {view.isShared && (
                <Badge variant="outline" className="shrink-0">
                  <Share2 className="h-3 w-3 mr-1" />
                  Shared
                </Badge>
              )}
            </div>
            {view.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {view.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {/* Filter badges */}
        {hasFilters ? (
          <div className="flex flex-wrap gap-2">
            {/* Status filters */}
            {view.filters.status && view.filters.status.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Status:</span>
                {view.filters.status.map((status) => (
                  <Badge key={status} variant="secondary" className="text-xs">
                    {STATUS_LABELS[status]}
                  </Badge>
                ))}
              </div>
            )}

            {/* Priority filters */}
            {view.filters.priority && view.filters.priority.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Priority:</span>
                {view.filters.priority.map((priority) => (
                  <Badge key={priority} variant="secondary" className="text-xs">
                    {PRIORITY_LABELS[priority]}
                  </Badge>
                ))}
              </div>
            )}

            {/* Assigned to filter */}
            {view.filters.assignedTo && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Assigned:</span>
                <Badge variant="secondary" className="text-xs">
                  {view.filters.assignedTo === "me"
                    ? "Me"
                    : view.filters.assignedTo === "unassigned"
                    ? "Unassigned"
                    : "Specific User"}
                </Badge>
              </div>
            )}

            {/* Search filter */}
            {view.filters.search && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Search:</span>
                <Badge variant="secondary" className="text-xs">
                  &quot;{view.filters.search}&quot;
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No filters applied</p>
        )}

        {/* Owner info and date */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          {showOwner && (view.ownerName || view.ownerEmail) && (
            <>
              <User className="h-3 w-3" />
              <span>{view.ownerName || view.ownerEmail}</span>
              <span>|</span>
            </>
          )}
          <span>Created {formatDate(view.createdAt)}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2 flex-wrap">
        {/* View Tickets button - always visible */}
        <Link href={`/dashboard/views/${view.id}`} className="flex-1 min-w-fit">
          <Button variant="default" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-1" />
            View Tickets
          </Button>
        </Link>

        {/* Edit button - only for owner */}
        {isOwner && (
          <Link href={`/dashboard/views/${view.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </Link>
        )}

        {/* Set as Default button - only for owner */}
        {isOwner && onSetDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetDefault}
            disabled={isSettingDefault}
          >
            {isSettingDefault ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : view.isDefault ? (
              <StarOff className="h-4 w-4" />
            ) : (
              <Star className="h-4 w-4" />
            )}
            <span className="sr-only">
              {view.isDefault ? "Remove default" : "Set as default"}
            </span>
          </Button>
        )}

        {/* Delete button - only for owner */}
        {isOwner && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete View</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{view.name}&quot;? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}

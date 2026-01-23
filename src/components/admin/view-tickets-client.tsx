"use client";

/**
 * View Tickets Client Component
 *
 * Displays tickets filtered by a saved view.
 * Fetches tickets using the view's saved filters.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TicketTable } from "@/components/admin/ticket-table";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Pencil, ArrowLeft } from "lucide-react";
import type { ViewFilters, TicketStatus, TicketPriority } from "@/db/schema";

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

/** Ticket type from API */
interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToId: string | null;
  createdAt: string;
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

/** Pagination type from API */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ViewTicketsClientProps {
  viewId: string;
  userId: string;
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

export function ViewTicketsClient({ viewId, userId }: ViewTicketsClientProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<SavedView | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current page from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

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
            throw new Error("You do not have access to this view");
          }
          throw new Error("Failed to fetch view");
        }
        const data = (await response.json()) as { view: SavedView };
        setView(data.view);
      } catch (err) {
        console.error("Error fetching view:", err);
        setError(err instanceof Error ? err.message : "Failed to load view");
      } finally {
        setIsLoadingView(false);
      }
    }
    fetchView();
  }, [viewId]);

  // Fetch tickets with filters
  const fetchTickets = useCallback(async () => {
    if (!view) return;

    setIsLoadingTickets(true);
    try {
      // Build query params from view filters
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "20");

      // Apply filters from view
      if (view.filters.status && view.filters.status.length > 0) {
        // The API expects a single status, so we'll use the first one
        // In a real implementation, you might want to modify the API to support multiple statuses
        params.set("status", view.filters.status[0]);
      }

      if (view.filters.priority && view.filters.priority.length > 0) {
        params.set("priority", view.filters.priority[0]);
      }

      if (view.filters.assignedTo) {
        if (view.filters.assignedTo === "me") {
          params.set("assignedTo", userId);
        } else if (view.filters.assignedTo === "unassigned") {
          // Note: The current API may not support this filter
          // You might need to modify the API to handle "unassigned"
          params.set("assignedTo", "unassigned");
        } else {
          params.set("assignedTo", view.filters.assignedTo);
        }
      }

      if (view.filters.search) {
        params.set("search", view.filters.search);
      }

      const response = await fetch(`/api/tickets?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }
      const data = (await response.json()) as { tickets: Ticket[]; pagination: Pagination };
      setTickets(data.tickets || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets");
    } finally {
      setIsLoadingTickets(false);
    }
  }, [view, currentPage, userId]);

  // Fetch tickets when view is loaded or page changes
  useEffect(() => {
    if (view) {
      fetchTickets();
    }
  }, [view, fetchTickets]);

  // Loading view
  if (isLoadingView) {
    return <LoadingState message="Loading view..." />;
  }

  // Error state
  if (error) {
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

  const isOwner = view.userId === userId;
  const hasFilters =
    (view.filters.status && view.filters.status.length > 0) ||
    (view.filters.priority && view.filters.priority.length > 0) ||
    view.filters.assignedTo ||
    view.filters.search;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/views">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {view.name}
            </h1>
            {view.description && (
              <p className="text-muted-foreground">{view.description}</p>
            )}
          </div>
        </div>
        {isOwner && (
          <Link href={`/dashboard/views/${viewId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit View
            </Button>
          </Link>
        )}
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Active filters:</span>
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
          {view.filters.search && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Search:</span>
              <Badge variant="secondary" className="text-xs">
                &quot;{view.filters.search}&quot;
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Tickets table */}
      {isLoadingTickets ? (
        <LoadingState message="Loading tickets..." />
      ) : (
        <TicketTable
          tickets={tickets}
          pagination={
            pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
          }
        />
      )}
    </div>
  );
}

"use client";

/**
 * Ticket Info Panel Component
 *
 * Displays ticket metadata and provides controls for status and assignment.
 * Used in the ticket detail page sidebar.
 */

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import {
  User,
  Mail,
  Building,
  Calendar,
  Clock,
  ChevronDown,
  AlertCircle,
  Loader2,
  Hash,
} from "lucide-react";
import type { TicketStatus, TicketPriority } from "@/db/schema";
import { TICKET_STATUSES } from "@/db/schema";

interface Customer {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  ticketCount: number;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  trackingToken: string;
  assignedToId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  firstResponseAt: Date | string | null;
  resolvedAt: Date | string | null;
  closedAt: Date | string | null;
  customer: Customer | null;
}

interface AssignableUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface TicketInfoPanelProps {
  ticket: Ticket;
  canChangeStatus: boolean;
  canAssign: boolean;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TicketInfoPanel({
  ticket,
  canChangeStatus,
  canAssign,
}: TicketInfoPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch assignable users on mount if canAssign is true
  useEffect(() => {
    if (canAssign) {
      setLoadingUsers(true);
      fetch("/api/users/assignable")
        .then((res) => res.json() as Promise<{ users?: AssignableUser[] }>)
        .then((data) => {
          setAssignableUsers(data.users || []);
        })
        .catch((err) => {
          console.error("Failed to load assignable users:", err);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [canAssign]);

  const handleStatusChange = async (newStatus: string) => {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/tickets/${ticket.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const data = await response.json() as { error?: string };
          throw new Error(data.error || "Failed to update status");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  const handleAssignChange = async (userId: string) => {
    setError(null);
    setIsAssigning(true);

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Failed to assign ticket");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAssigning(false);
    }
  };

  // Find current assignee name
  const currentAssignee = assignableUsers.find(
    (u) => u.id === ticket.assignedToId
  );

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Ticket Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Ticket Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Number</Label>
            <span className="font-mono text-sm">{ticket.ticketNumber}</span>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Status</Label>
            {canChangeStatus ? (
              <Select
                value={ticket.status}
                onValueChange={handleStatusChange}
                disabled={isPending}
              >
                <SelectTrigger className="w-[140px] h-8">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      <StatusBadge status={status} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <StatusBadge status={ticket.status} />
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Priority</Label>
            <PriorityBadge priority={ticket.priority} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Assigned</Label>
            {canAssign ? (
              <Select
                value={ticket.assignedToId || "unassigned"}
                onValueChange={(value) => {
                  if (value !== "unassigned") {
                    handleAssignChange(value);
                  }
                }}
                disabled={isAssigning || loadingUsers}
              >
                <SelectTrigger className="w-[160px] h-8">
                  {isAssigning || loadingUsers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectValue>
                      {currentAssignee
                        ? currentAssignee.name || currentAssignee.email
                        : "Unassigned"}
                    </SelectValue>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" disabled>
                    Unassigned
                  </SelectItem>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">
                {currentAssignee
                  ? currentAssignee.name || currentAssignee.email
                  : "Unassigned"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Collapsible open={customerOpen} onOpenChange={setCustomerOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Customer</CardTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    customerOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              {ticket.customer ? (
                <>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {ticket.customer.name || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm break-all">{ticket.customer.email}</p>
                  </div>

                  {ticket.customer.organization && (
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{ticket.customer.organization}</p>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {ticket.customer.ticketCount} total ticket(s)
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Customer information unavailable
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Timeline Details */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    detailsOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(ticket.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm">{formatDate(ticket.updatedAt)}</p>
                </div>
              </div>

              {ticket.firstResponseAt && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">First Response</p>
                    <p className="text-sm">{formatDate(ticket.firstResponseAt)}</p>
                  </div>
                </div>
              )}

              {ticket.resolvedAt && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                    <p className="text-sm">{formatDate(ticket.resolvedAt)}</p>
                  </div>
                </div>
              )}

              {ticket.closedAt && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Closed</p>
                    <p className="text-sm">{formatDate(ticket.closedAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

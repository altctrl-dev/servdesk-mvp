"use client";

/**
 * Backlog Report Client Component
 *
 * Real-time backlog analysis showing:
 * - Tickets by age (0-24h, 24-48h, 48-72h, 72h+)
 * - Unassigned tickets
 * - Stale tickets (no activity in 48h+)
 */

import * as React from "react";
import Link from "next/link";
import { MetricCard } from "@/components/reports/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Clock, UserX, AlertTriangle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  assignedToId: string | null;
  assignedToName?: string;
}

interface BacklogMetrics {
  age0to24h: number;
  age24to48h: number;
  age48to72h: number;
  age72hPlus: number;
  unassigned: number;
  staleTickets: Ticket[];
}

// =============================================================================
// HELPERS
// =============================================================================

function getHoursDiff(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
}

function formatAge(dateStr: string): string {
  const hours = getHoursDiff(dateStr);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority.toUpperCase()) {
    case "URGENT":
      return "destructive";
    case "HIGH":
      return "default";
    default:
      return "secondary";
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toUpperCase()) {
    case "NEW":
      return "default";
    case "OPEN":
      return "secondary";
    case "PENDING_CUSTOMER":
      return "outline";
    default:
      return "secondary";
  }
}

function calculateMetrics(tickets: Ticket[]): BacklogMetrics {
  const metrics: BacklogMetrics = {
    age0to24h: 0,
    age24to48h: 0,
    age48to72h: 0,
    age72hPlus: 0,
    unassigned: 0,
    staleTickets: [],
  };

  for (const ticket of tickets) {
    const createdHours = getHoursDiff(ticket.createdAt);
    const updatedHours = getHoursDiff(ticket.updatedAt);

    // Age buckets (based on creation time)
    if (createdHours < 24) {
      metrics.age0to24h++;
    } else if (createdHours < 48) {
      metrics.age24to48h++;
    } else if (createdHours < 72) {
      metrics.age48to72h++;
    } else {
      metrics.age72hPlus++;
    }

    // Unassigned
    if (!ticket.assignedToId) {
      metrics.unassigned++;
    }

    // Stale tickets (no activity in 48h+)
    if (updatedHours >= 48) {
      metrics.staleTickets.push(ticket);
    }
  }

  // Sort stale tickets by last updated (oldest first)
  metrics.staleTickets.sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );

  return metrics;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BacklogReportClient() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null);

  const fetchBacklog = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch open tickets (NEW, OPEN, PENDING_CUSTOMER, ON_HOLD)
      const params = new URLSearchParams({
        status: "NEW,OPEN,PENDING_CUSTOMER,ON_HOLD",
        limit: "500", // Get enough for analysis
      });
      const response = await fetch(`/api/tickets?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || "Failed to fetch tickets");
      }

      const data = await response.json() as { tickets?: Ticket[] };
      setTickets(data.tickets || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  const metrics = React.useMemo(() => calculateMetrics(tickets), [tickets]);

  const totalBacklog = tickets.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Backlog Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Real-time analysis of open tickets by age and activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBacklog}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !lastRefresh && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!error && (lastRefresh || !loading) && (
        <>
          {/* Total Backlog */}
          <Card>
            <CardContent className="flex items-center justify-between py-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Open Tickets</p>
                <p className="text-4xl font-bold tabular-nums">{totalBacklog}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Unassigned</p>
                <p className="text-2xl font-semibold text-destructive tabular-nums">
                  {metrics.unassigned}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Age Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Tickets by Age</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="0-24 hours"
                value={metrics.age0to24h}
                description="Fresh tickets"
                variant="success"
              />
              <MetricCard
                title="24-48 hours"
                value={metrics.age24to48h}
                description="Getting old"
                variant={metrics.age24to48h > 10 ? "warning" : "default"}
              />
              <MetricCard
                title="48-72 hours"
                value={metrics.age48to72h}
                description="Needs attention"
                variant={metrics.age48to72h > 5 ? "warning" : "default"}
              />
              <MetricCard
                title="72+ hours"
                value={metrics.age72hPlus}
                description="Critical backlog"
                variant={metrics.age72hPlus > 0 ? "danger" : "default"}
              />
            </div>
          </div>

          {/* Unassigned Alert */}
          {metrics.unassigned > 0 && (
            <Card className="border-warning">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-warning" />
                  <CardTitle className="text-base">Unassigned Tickets</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {metrics.unassigned} ticket{metrics.unassigned !== 1 ? "s" : ""} waiting to be
                  assigned to an agent. Consider reviewing the queue and distributing workload.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stale Tickets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle>Stale Tickets</CardTitle>
                </div>
                <Badge variant="secondary">{metrics.staleTickets.length} tickets</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Tickets with no activity in the last 48 hours
              </p>
            </CardHeader>
            <CardContent>
              {metrics.staleTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No stale tickets found - great job keeping things moving!
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="text-right">Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.staleTickets.slice(0, 10).map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/tickets/${ticket.id}`}
                            className="font-medium hover:underline"
                          >
                            {ticket.ticketNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ticket.subject}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticket.status)}>
                            {ticket.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatAge(ticket.createdAt)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatAge(ticket.updatedAt)} ago
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {metrics.staleTickets.length > 10 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Showing 10 of {metrics.staleTickets.length} stale tickets
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

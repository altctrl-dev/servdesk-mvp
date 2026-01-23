"use client";

/**
 * Team Report Client Component
 *
 * Interactive client component for team performance report.
 * Fetches data from /api/reports/team and displays metrics.
 */

import * as React from "react";
import { ReportHeader } from "@/components/reports/report-header";
import { MetricCard } from "@/components/reports/metric-card";
import { AgentTable, type AgentData } from "@/components/reports/agent-table";
import type { DateRangePickerValue, PresetRangeValue } from "@/components/reports/date-range-picker";
import { Loader2 } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TeamReportData {
  agents: AgentData[];
  summary: {
    totalTicketsHandled: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    totalOpenTickets: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function isPresetRange(value: DateRangePickerValue): value is PresetRangeValue {
  return "range" in value;
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

function buildApiUrl(dateRange: DateRangePickerValue): string {
  const params = new URLSearchParams();
  if (isPresetRange(dateRange)) {
    params.set("range", dateRange.range);
  } else {
    params.set("from", dateRange.from.toISOString());
    params.set("to", dateRange.to.toISOString());
  }
  return `/api/reports/team?${params.toString()}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamReportClient() {
  const [dateRange, setDateRange] = React.useState<DateRangePickerValue>({
    range: "30d",
  });
  const [data, setData] = React.useState<TeamReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<string>("ticketsHandled");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Fetch data when date range changes
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildApiUrl(dateRange));
        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || "Failed to fetch report data");
        }
        const result = await response.json() as TeamReportData;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Sort agents
  const sortedAgents = React.useMemo(() => {
    if (!data?.agents) return [];
    return [...data.agents].sort((a, b) => {
      const aValue = a[sortBy as keyof AgentData];
      const bValue = b[sortBy as keyof AgentData];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
  }, [data?.agents, sortBy, sortOrder]);

  // Export handler
  const handleExport = React.useCallback(() => {
    if (!data) return;

    const headers = [
      "Agent",
      "Email",
      "Status",
      "Tickets Handled",
      "Avg Response Time (min)",
      "Avg Resolution Time (min)",
      "Current Workload",
    ];
    const rows = data.agents.map((agent) => [
      agent.name,
      agent.email,
      agent.isActive ? "Active" : "Inactive",
      agent.ticketsHandled,
      Math.round(agent.avgResponseTime),
      Math.round(agent.avgResolutionTime),
      agent.currentWorkload,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Team Performance"
        description="View team performance metrics, productivity, and workload distribution"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showExport={!!data}
        onExport={handleExport}
      />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Handled"
              value={data.summary.totalTicketsHandled}
              description="Tickets resolved or closed"
              variant="default"
            />
            <MetricCard
              title="Avg Response Time"
              value={formatTime(data.summary.avgResponseTime)}
              description="First response time"
              variant={data.summary.avgResponseTime > 120 ? "warning" : "success"}
            />
            <MetricCard
              title="Avg Resolution Time"
              value={formatTime(data.summary.avgResolutionTime)}
              description="Time to resolution"
              variant={data.summary.avgResolutionTime > 480 ? "warning" : "success"}
            />
            <MetricCard
              title="Open Tickets"
              value={data.summary.totalOpenTickets}
              description="Currently open"
              variant={data.summary.totalOpenTickets > 50 ? "warning" : "default"}
            />
          </div>

          {/* Agent Table */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Agent Performance</h2>
            <AgentTable
              agents={sortedAgents}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </div>
        </>
      )}

      {!loading && !error && !data && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No data available for the selected date range
        </div>
      )}
    </div>
  );
}

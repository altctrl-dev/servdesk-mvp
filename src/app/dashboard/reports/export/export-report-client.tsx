"use client";

/**
 * Export Report Client Component
 *
 * Allows admins to export report data as CSV files.
 * Supports: Team report, Volume report
 */

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Users, TrendingUp, FileSpreadsheet, Loader2, Check, AlertCircle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

type ExportStatus = "idle" | "loading" | "success" | "error";

interface ExportState {
  status: ExportStatus;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: formatDateForInput(from),
    to: formatDateForInput(to),
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExportReportClient() {
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [teamExport, setTeamExport] = React.useState<ExportState>({ status: "idle" });
  const [volumeExport, setVolumeExport] = React.useState<ExportState>({ status: "idle" });

  const handleTeamExport = async () => {
    setTeamExport({ status: "loading" });

    try {
      const params = new URLSearchParams({
        from: new Date(dateFrom).toISOString(),
        to: new Date(dateTo).toISOString(),
      });
      const response = await fetch(`/api/reports/team?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || "Failed to fetch team report");
      }

      interface TeamAgent {
        name: string;
        email: string;
        isActive: boolean;
        ticketsHandled: number;
        avgResponseTime: number;
        avgResolutionTime: number;
        currentWorkload: number;
      }

      interface TeamReportResponse {
        agents: TeamAgent[];
        summary: {
          totalTicketsHandled: number;
          avgResponseTime: number;
          avgResolutionTime: number;
          totalOpenTickets: number;
        };
      }

      const data = await response.json() as TeamReportResponse;

      // Build CSV
      const headers = [
        "Agent",
        "Email",
        "Status",
        "Tickets Handled",
        "Avg Response Time (min)",
        "Avg Resolution Time (min)",
        "Current Workload",
      ];

      const rows: (string | number)[][] = data.agents.map((agent) => [
        `"${agent.name}"`,
        agent.email,
        agent.isActive ? "Active" : "Inactive",
        agent.ticketsHandled,
        Math.round(agent.avgResponseTime),
        Math.round(agent.avgResolutionTime),
        agent.currentWorkload,
      ]);

      // Add summary
      rows.push([]);
      rows.push(["Summary"]);
      rows.push(["Total Tickets Handled", data.summary.totalTicketsHandled]);
      rows.push(["Avg Response Time (min)", Math.round(data.summary.avgResponseTime)]);
      rows.push(["Avg Resolution Time (min)", Math.round(data.summary.avgResolutionTime)]);
      rows.push(["Total Open Tickets", data.summary.totalOpenTickets]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `team-report-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setTeamExport({ status: "success" });
      setTimeout(() => setTeamExport({ status: "idle" }), 2000);
    } catch (err) {
      setTeamExport({
        status: "error",
        error: err instanceof Error ? err.message : "Export failed",
      });
    }
  };

  const handleVolumeExport = async () => {
    setVolumeExport({ status: "loading" });

    try {
      const params = new URLSearchParams({
        from: new Date(dateFrom).toISOString(),
        to: new Date(dateTo).toISOString(),
        groupBy: "day",
      });
      const response = await fetch(`/api/reports/volume?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || "Failed to fetch volume report");
      }

      interface TrendPoint {
        date: string;
        created: number;
        resolved: number;
        closed: number;
      }

      interface VolumeReportResponse {
        trend: TrendPoint[];
        distribution: {
          byStatus: Record<string, number>;
          byPriority: Record<string, number>;
        };
        summary: {
          totalCreated: number;
          totalResolved: number;
          totalClosed: number;
          avgDaily: number;
        };
      }

      const data = await response.json() as VolumeReportResponse;

      // Build CSV
      const lines = [
        "Ticket Volume Report",
        `Date Range,${dateFrom} to ${dateTo}`,
        "",
        "Summary",
        `Total Created,${data.summary.totalCreated}`,
        `Total Resolved,${data.summary.totalResolved}`,
        `Total Closed,${data.summary.totalClosed}`,
        `Avg Daily,${data.summary.avgDaily}`,
        "",
        "Daily Trend",
        "Date,Created,Resolved,Closed",
        ...data.trend.map((t) =>
          `${t.date},${t.created},${t.resolved},${t.closed}`
        ),
        "",
        "Distribution by Status",
        ...Object.entries(data.distribution.byStatus).map(
          ([status, count]) => `${status},${count}`
        ),
        "",
        "Distribution by Priority",
        ...Object.entries(data.distribution.byPriority).map(
          ([priority, count]) => `${priority},${count}`
        ),
      ];

      const csv = lines.join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `volume-report-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setVolumeExport({ status: "success" });
      setTimeout(() => setVolumeExport({ status: "idle" }), 2000);
    } catch (err) {
      setVolumeExport({
        status: "error",
        error: err instanceof Error ? err.message : "Export failed",
      });
    }
  };

  const getButtonContent = (state: ExportState, label: string) => {
    switch (state.status) {
      case "loading":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        );
      case "success":
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            Downloaded
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Download className="mr-2 h-4 w-4" />
            {label}
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Export Data</h1>
        <p className="text-sm text-muted-foreground">
          Download report data as CSV files for external analysis
        </p>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
          <CardDescription>
            Select the date range for exported data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Report Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Performance</CardTitle>
                <CardDescription>Agent metrics and workload data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Per-agent tickets handled</li>
                <li>Average response times</li>
                <li>Average resolution times</li>
                <li>Current workload</li>
                <li>Summary statistics</li>
              </ul>
            </div>
            <Button
              onClick={handleTeamExport}
              disabled={teamExport.status === "loading"}
              className="w-full"
              variant={teamExport.status === "error" ? "destructive" : "default"}
            >
              {getButtonContent(teamExport, "Export Team Report")}
            </Button>
            {teamExport.status === "error" && teamExport.error && (
              <p className="text-xs text-destructive">{teamExport.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Volume Report Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Ticket Volume</CardTitle>
                <CardDescription>Trends and distribution data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Daily ticket counts</li>
                <li>Created/resolved/closed trends</li>
                <li>Distribution by status</li>
                <li>Distribution by priority</li>
                <li>Summary statistics</li>
              </ul>
            </div>
            <Button
              onClick={handleVolumeExport}
              disabled={volumeExport.status === "loading"}
              className="w-full"
              variant={volumeExport.status === "error" ? "destructive" : "default"}
            >
              {getButtonContent(volumeExport, "Export Volume Report")}
            </Button>
            {volumeExport.status === "error" && volumeExport.error && (
              <p className="text-xs text-destructive">{volumeExport.error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Note */}
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 py-4">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">About CSV Exports</p>
            <p>
              Exported files are in CSV format, compatible with Excel, Google Sheets,
              and other spreadsheet applications. The data reflects the selected date
              range and is generated in real-time from the database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

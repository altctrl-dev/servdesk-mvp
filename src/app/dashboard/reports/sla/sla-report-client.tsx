"use client";

/**
 * SLA Report Client Component
 *
 * Interactive client component for SLA compliance report.
 * Fetches data from /api/reports/sla and displays compliance metrics.
 */

import * as React from "react";
import { ReportHeader } from "@/components/reports/report-header";
import { MetricCard } from "@/components/reports/metric-card";
import { ComplianceGauge } from "@/components/reports/compliance-gauge";
import type { DateRangePickerValue, PresetRangeValue } from "@/components/reports/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface SLAReportData {
  compliance: {
    firstResponse: {
      total: number;
      withinSLA: number;
      breached: number;
      complianceRate: number;
    };
    resolution: {
      total: number;
      withinSLA: number;
      breached: number;
      complianceRate: number;
    };
  };
  breachesByPriority: {
    URGENT: { firstResponse: number; resolution: number };
    HIGH: { firstResponse: number; resolution: number };
    NORMAL: { firstResponse: number; resolution: number };
  };
  recentBreaches: Array<{
    ticketId: string;
    ticketNumber: string;
    subject: string;
    priority: string;
    breachType: "firstResponse" | "resolution";
    breachTime: number;
    createdAt: string;
  }>;
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

function buildApiUrl(dateRange: DateRangePickerValue): string {
  const params = new URLSearchParams();
  if (isPresetRange(dateRange)) {
    params.set("range", dateRange.range);
  } else {
    params.set("from", dateRange.from.toISOString());
    params.set("to", dateRange.to.toISOString());
  }
  return `/api/reports/sla?${params.toString()}`;
}

function formatBreachTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m over`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h over`;
  }
  return `${hours}h ${mins}m over`;
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

// =============================================================================
// COMPONENT
// =============================================================================

export function SLAReportClient() {
  const [dateRange, setDateRange] = React.useState<DateRangePickerValue>({
    range: "30d",
  });
  const [data, setData] = React.useState<SLAReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
        const result = await response.json() as SLAReportData;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Export handler
  const handleExport = React.useCallback(() => {
    if (!data) return;

    const lines = [
      "SLA Compliance Report",
      `Date Range: ${data.dateRange.from} to ${data.dateRange.to}`,
      "",
      "First Response Compliance",
      `Total,${data.compliance.firstResponse.total}`,
      `Within SLA,${data.compliance.firstResponse.withinSLA}`,
      `Breached,${data.compliance.firstResponse.breached}`,
      `Compliance Rate,${data.compliance.firstResponse.complianceRate}%`,
      "",
      "Resolution Compliance",
      `Total,${data.compliance.resolution.total}`,
      `Within SLA,${data.compliance.resolution.withinSLA}`,
      `Breached,${data.compliance.resolution.breached}`,
      `Compliance Rate,${data.compliance.resolution.complianceRate}%`,
      "",
      "Breaches by Priority",
      "Priority,First Response,Resolution",
      `URGENT,${data.breachesByPriority.URGENT.firstResponse},${data.breachesByPriority.URGENT.resolution}`,
      `HIGH,${data.breachesByPriority.HIGH.firstResponse},${data.breachesByPriority.HIGH.resolution}`,
      `NORMAL,${data.breachesByPriority.NORMAL.firstResponse},${data.breachesByPriority.NORMAL.resolution}`,
    ];

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sla-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="SLA Compliance"
        description="Service Level Agreement compliance, response times, and breach analysis"
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
          {/* Compliance Gauges */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <ComplianceGauge
                  label="First Response SLA"
                  value={data.compliance.firstResponse.complianceRate}
                  total={data.compliance.firstResponse.total}
                  withinSLA={data.compliance.firstResponse.withinSLA}
                  breached={data.compliance.firstResponse.breached}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <ComplianceGauge
                  label="Resolution SLA"
                  value={data.compliance.resolution.complianceRate}
                  total={data.compliance.resolution.total}
                  withinSLA={data.compliance.resolution.withinSLA}
                  breached={data.compliance.resolution.breached}
                />
              </CardContent>
            </Card>
          </div>

          {/* Breaches by Priority */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Breaches by Priority</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                title="Urgent Breaches"
                value={
                  data.breachesByPriority.URGENT.firstResponse +
                  data.breachesByPriority.URGENT.resolution
                }
                description={`${data.breachesByPriority.URGENT.firstResponse} response, ${data.breachesByPriority.URGENT.resolution} resolution`}
                variant="danger"
              />
              <MetricCard
                title="High Breaches"
                value={
                  data.breachesByPriority.HIGH.firstResponse +
                  data.breachesByPriority.HIGH.resolution
                }
                description={`${data.breachesByPriority.HIGH.firstResponse} response, ${data.breachesByPriority.HIGH.resolution} resolution`}
                variant="warning"
              />
              <MetricCard
                title="Normal Breaches"
                value={
                  data.breachesByPriority.NORMAL.firstResponse +
                  data.breachesByPriority.NORMAL.resolution
                }
                description={`${data.breachesByPriority.NORMAL.firstResponse} response, ${data.breachesByPriority.NORMAL.resolution} resolution`}
                variant="default"
              />
            </div>
          </div>

          {/* Recent Breaches Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent SLA Breaches</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentBreaches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No SLA breaches in the selected period
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Breach Type</TableHead>
                      <TableHead className="text-right">Breach Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentBreaches.map((breach) => (
                      <TableRow key={`${breach.ticketId}-${breach.breachType}`}>
                        <TableCell>
                          <Link
                            href={`/dashboard/tickets/${breach.ticketId}`}
                            className="font-medium hover:underline"
                          >
                            {breach.ticketNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {breach.subject}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(breach.priority)}>
                            {breach.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {breach.breachType === "firstResponse"
                            ? "First Response"
                            : "Resolution"}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatBreachTime(breach.breachTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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

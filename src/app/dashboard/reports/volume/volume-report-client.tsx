"use client";

/**
 * Volume Report Client Component
 *
 * Interactive client component for ticket volume report.
 * Fetches data from /api/reports/volume and displays trends.
 */

import * as React from "react";
import { ReportHeader } from "@/components/reports/report-header";
import { MetricCard } from "@/components/reports/metric-card";
import { TrendChart } from "@/components/reports/trend-chart";
import { DistributionChart } from "@/components/reports/distribution-chart";
import type { DateRangePickerValue, PresetRangeValue } from "@/components/reports/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

type GroupBy = "day" | "week" | "month";

interface VolumeReportData {
  trend: Array<{
    date: string;
    created: number;
    resolved: number;
    closed: number;
  }>;
  distribution: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  peakHours: Array<{ hour: number; count: number }>;
  peakDays: Array<{ day: number; dayName: string; count: number }>;
  summary: {
    totalCreated: number;
    totalResolved: number;
    totalClosed: number;
    avgDaily: number;
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

function buildApiUrl(dateRange: DateRangePickerValue, groupBy: GroupBy): string {
  const params = new URLSearchParams();
  if (isPresetRange(dateRange)) {
    params.set("range", dateRange.range);
  } else {
    params.set("from", dateRange.from.toISOString());
    params.set("to", dateRange.to.toISOString());
  }
  params.set("groupBy", groupBy);
  return `/api/reports/volume?${params.toString()}`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function VolumeReportClient() {
  const [dateRange, setDateRange] = React.useState<DateRangePickerValue>({
    range: "30d",
  });
  const [groupBy, setGroupBy] = React.useState<GroupBy>("day");
  const [data, setData] = React.useState<VolumeReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch data when date range or groupBy changes
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildApiUrl(dateRange, groupBy));
        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || "Failed to fetch report data");
        }
        const result = await response.json() as VolumeReportData;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, groupBy]);

  // Export handler
  const handleExport = React.useCallback(() => {
    if (!data) return;

    const lines = [
      "Ticket Volume Report",
      `Date Range: ${data.dateRange.from} to ${data.dateRange.to}`,
      "",
      "Summary",
      `Total Created,${data.summary.totalCreated}`,
      `Total Resolved,${data.summary.totalResolved}`,
      `Total Closed,${data.summary.totalClosed}`,
      `Avg Daily,${data.summary.avgDaily}`,
      "",
      "Trend Data",
      "Date,Created,Resolved,Closed",
      ...data.trend.map((t) => `${t.date},${t.created},${t.resolved},${t.closed}`),
    ];

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volume-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // Transform distribution data for charts
  const statusDistribution = React.useMemo(() => {
    if (!data?.distribution.byStatus) return [];
    return Object.entries(data.distribution.byStatus).map(([label, value]) => ({
      label,
      value,
    }));
  }, [data?.distribution.byStatus]);

  const priorityDistribution = React.useMemo(() => {
    if (!data?.distribution.byPriority) return [];
    return Object.entries(data.distribution.byPriority).map(([label, value]) => ({
      label,
      value,
    }));
  }, [data?.distribution.byPriority]);

  // Get top peak hours and days
  const topPeakHours = data?.peakHours.slice(0, 3) || [];
  const topPeakDays = data?.peakDays.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Ticket Volume"
        description="Ticket volume trends, peak hours, and channel distribution analytics"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showExport={!!data}
        onExport={handleExport}
      />

      {/* GroupBy Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by:</span>
        {(["day", "week", "month"] as const).map((option) => (
          <Button
            key={option}
            variant={groupBy === option ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupBy(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </Button>
        ))}
      </div>

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
              title="Created"
              value={data.summary.totalCreated}
              description="Tickets created in period"
              variant="default"
            />
            <MetricCard
              title="Resolved"
              value={data.summary.totalResolved}
              description="Tickets resolved in period"
              variant="success"
            />
            <MetricCard
              title="Closed"
              value={data.summary.totalClosed}
              description="Tickets closed in period"
              variant="default"
            />
            <MetricCard
              title="Avg Daily"
              value={data.summary.avgDaily}
              description="Average tickets per day"
              variant="default"
            />
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={data.trend} height={280} />
            </CardContent>
          </Card>

          {/* Distribution Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribution by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <DistributionChart data={statusDistribution} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribution by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <DistributionChart data={priorityDistribution} />
              </CardContent>
            </Card>
          </div>

          {/* Peak Hours and Days */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {topPeakHours.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topPeakHours.map((peak, index) => (
                      <div
                        key={peak.hour}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium">
                            {formatHour(peak.hour)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {peak.count} tickets
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Busiest Days</CardTitle>
              </CardHeader>
              <CardContent>
                {topPeakDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topPeakDays.map((peak, index) => (
                      <div
                        key={peak.day}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium">{peak.dayName}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {peak.count} tickets
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

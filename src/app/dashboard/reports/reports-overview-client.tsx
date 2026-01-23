"use client";

/**
 * Reports Overview Client Component
 *
 * Dashboard showing quick stats from all report types
 * with links to detailed reports.
 */

import * as React from "react";
import Link from "next/link";
import { MetricCard } from "@/components/reports/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Clock, TrendingUp, BarChart3, ArrowRight } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TeamSummary {
  totalTicketsHandled: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  totalOpenTickets: number;
}

interface SLASummary {
  firstResponseRate: number;
  resolutionRate: number;
}

interface VolumeSummary {
  totalCreated: number;
  totalResolved: number;
  avgDaily: number;
}

interface OverviewData {
  team: TeamSummary | null;
  sla: SLASummary | null;
  volume: VolumeSummary | null;
}

// =============================================================================
// HELPERS
// =============================================================================

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

// =============================================================================
// REPORT CARDS
// =============================================================================

interface ReportCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

function ReportCard({ title, description, href, icon, children }: ReportCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {children}
      </CardContent>
      <div className="border-t p-4">
        <Link href={href}>
          <Button variant="ghost" className="w-full justify-between">
            View Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReportsOverviewClient() {
  const [data, setData] = React.useState<OverviewData>({
    team: null,
    sla: null,
    volume: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch summary data from all APIs
  React.useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [teamRes, slaRes, volumeRes] = await Promise.allSettled([
          fetch("/api/reports/team?range=30d"),
          fetch("/api/reports/sla?range=30d"),
          fetch("/api/reports/volume?range=30d"),
        ]);

        const newData: OverviewData = {
          team: null,
          sla: null,
          volume: null,
        };

        if (teamRes.status === "fulfilled" && teamRes.value.ok) {
          const teamData = await teamRes.value.json() as { summary: TeamSummary };
          newData.team = teamData.summary;
        }

        if (slaRes.status === "fulfilled" && slaRes.value.ok) {
          const slaData = await slaRes.value.json() as {
            compliance: {
              firstResponse: { complianceRate: number };
              resolution: { complianceRate: number };
            };
          };
          newData.sla = {
            firstResponseRate: slaData.compliance.firstResponse.complianceRate,
            resolutionRate: slaData.compliance.resolution.complianceRate,
          };
        }

        if (volumeRes.status === "fulfilled" && volumeRes.value.ok) {
          const volumeData = await volumeRes.value.json() as { summary: VolumeSummary };
          newData.volume = volumeData.summary;
        }

        setData(newData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports Overview</h1>
        <p className="text-sm text-muted-foreground">
          Quick insights from the last 30 days
        </p>
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

      {!loading && !error && (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Tickets Handled"
              value={data.team?.totalTicketsHandled ?? "-"}
              description="Last 30 days"
              variant="default"
            />
            <MetricCard
              title="Avg Response Time"
              value={data.team ? formatTime(data.team.avgResponseTime) : "-"}
              description="First response"
              variant={data.team && data.team.avgResponseTime > 120 ? "warning" : "success"}
            />
            <MetricCard
              title="SLA Compliance"
              value={
                data.sla
                  ? `${Math.round((data.sla.firstResponseRate + data.sla.resolutionRate) / 2)}%`
                  : "-"
              }
              description="Overall rate"
              variant={
                data.sla && (data.sla.firstResponseRate + data.sla.resolutionRate) / 2 >= 90
                  ? "success"
                  : data.sla && (data.sla.firstResponseRate + data.sla.resolutionRate) / 2 >= 70
                  ? "warning"
                  : "danger"
              }
            />
            <MetricCard
              title="Tickets Created"
              value={data.volume?.totalCreated ?? "-"}
              description="Last 30 days"
              variant="default"
            />
          </div>

          {/* Report Cards */}
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <ReportCard
              title="Team Performance"
              description="Agent productivity and workload"
              href="/dashboard/reports/team"
              icon={<Users className="h-5 w-5 text-primary" />}
            >
              {data.team ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Open tickets</span>
                    <span className="font-medium">{data.team.totalOpenTickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg resolution</span>
                    <span className="font-medium">{formatTime(data.team.avgResolutionTime)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </ReportCard>

            <ReportCard
              title="SLA Compliance"
              description="Response and resolution metrics"
              href="/dashboard/reports/sla"
              icon={<Clock className="h-5 w-5 text-primary" />}
            >
              {data.sla ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First response</span>
                    <span className="font-medium">{data.sla.firstResponseRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="font-medium">{data.sla.resolutionRate}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </ReportCard>

            <ReportCard
              title="Ticket Volume"
              description="Trends and distribution"
              href="/dashboard/reports/volume"
              icon={<TrendingUp className="h-5 w-5 text-primary" />}
            >
              {data.volume ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="font-medium">{data.volume.totalResolved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily average</span>
                    <span className="font-medium">{data.volume.avgDaily}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </ReportCard>

            <ReportCard
              title="Backlog Analysis"
              description="Aging and stale tickets"
              href="/dashboard/reports/backlog"
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
            >
              <p className="text-sm text-muted-foreground">
                View tickets by age and identify stale items
              </p>
            </ReportCard>
          </div>
        </>
      )}
    </div>
  );
}

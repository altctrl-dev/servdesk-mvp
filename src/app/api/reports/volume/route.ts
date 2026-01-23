/**
 * Volume Report API
 *
 * GET: Returns ticket volume metrics and trends
 * - Requires SUPERVISOR, ADMIN, or SUPER_ADMIN role
 * - Supports date range filtering (7d, 30d, 90d, or custom)
 * - Supports groupBy parameter (day, week, month)
 * - Returns trend data, distribution, peak hours/days, and summary
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, type TicketStatus, type TicketPriority, TICKET_STATUSES, TICKET_PRIORITIES } from "@/db";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import { parseDateRange } from "@/lib/reports";
import { and, gte, lte, count, eq } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// TYPES
// =============================================================================

/** Grouping options for trend data */
type GroupBy = "day" | "week" | "month";

/** Trend data point */
interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
  closed: number;
}

/** Distribution by status */
type StatusDistribution = Record<TicketStatus, number>;

/** Distribution by priority */
type PriorityDistribution = Record<TicketPriority, number>;

/** Peak hour data */
interface PeakHour {
  hour: number;
  count: number;
}

/** Peak day data */
interface PeakDay {
  day: number;
  dayName: string;
  count: number;
}

/** Volume report response shape */
interface VolumeReportResponse {
  trend: TrendPoint[];
  distribution: {
    byStatus: StatusDistribution;
    byPriority: PriorityDistribution;
  };
  peakHours: PeakHour[];
  peakDays: PeakDay[];
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
// CONSTANTS
// =============================================================================

const ALLOWED_ROLES = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"] as const;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the ISO week number for a date
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Format a date for trend grouping based on groupBy parameter
 */
function formatTrendKey(date: Date, groupBy: GroupBy): string {
  switch (groupBy) {
    case "day":
      return date.toISOString().split("T")[0]; // YYYY-MM-DD
    case "week":
      return `Week ${getISOWeekNumber(date)}`;
    case "month":
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    default:
      return date.toISOString().split("T")[0];
  }
}

/**
 * Generate all date keys within a range based on groupBy
 */
function generateDateKeys(start: Date, end: Date, groupBy: GroupBy): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  const current = new Date(start);
  while (current <= end) {
    const key = formatTrendKey(current, groupBy);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    // Increment based on groupBy
    if (groupBy === "day") {
      current.setDate(current.getDate() + 1);
    } else if (groupBy === "week") {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return keys;
}

/**
 * Calculate number of days in a date range
 */
function getDayCount(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// =============================================================================
// GET: Volume Report
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSessionWithRole();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "Unauthorized: Account is disabled" },
        { status: 401 }
      );
    }

    // Check role authorization
    if (!hasAnyRole(session.roles, [...ALLOWED_ROLES])) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions. Requires SUPERVISOR, ADMIN, or SUPER_ADMIN role." },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const groupByParam = searchParams.get("groupBy") || "day";

    // Validate groupBy parameter
    const validGroupBy: GroupBy[] = ["day", "week", "month"];
    const groupBy: GroupBy = validGroupBy.includes(groupByParam as GroupBy)
      ? (groupByParam as GroupBy)
      : "day";

    // Parse date range
    let dateRange;
    try {
      dateRange = parseDateRange(range, from, to);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid date range" },
        { status: 400 }
      );
    }

    // Get database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // ==========================================================================
    // Fetch tickets created within date range
    // ==========================================================================

    const ticketsInRange = await db
      .select({
        id: tickets.id,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .where(
        and(
          gte(tickets.createdAt, dateRange.start),
          lte(tickets.createdAt, dateRange.end)
        )
      );

    // ==========================================================================
    // Fetch tickets resolved within date range (may be created before range)
    // ==========================================================================

    const ticketsResolvedInRange = await db
      .select({
        id: tickets.id,
        resolvedAt: tickets.resolvedAt,
      })
      .from(tickets)
      .where(
        and(
          gte(tickets.resolvedAt, dateRange.start),
          lte(tickets.resolvedAt, dateRange.end)
        )
      );

    // ==========================================================================
    // Fetch tickets closed within date range (may be created before range)
    // ==========================================================================

    const ticketsClosedInRange = await db
      .select({
        id: tickets.id,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .where(
        and(
          gte(tickets.closedAt, dateRange.start),
          lte(tickets.closedAt, dateRange.end)
        )
      );

    // ==========================================================================
    // Fetch ALL tickets for distribution (current state snapshot)
    // ==========================================================================

    const statusCounts = await Promise.all(
      TICKET_STATUSES.map(async (status) => {
        const result = await db
          .select({ count: count() })
          .from(tickets)
          .where(eq(tickets.status, status));
        return { status, count: result[0]?.count || 0 };
      })
    );

    const priorityCounts = await Promise.all(
      TICKET_PRIORITIES.map(async (priority) => {
        const result = await db
          .select({ count: count() })
          .from(tickets)
          .where(eq(tickets.priority, priority));
        return { priority, count: result[0]?.count || 0 };
      })
    );

    // ==========================================================================
    // Build trend data
    // ==========================================================================

    // Generate all date keys for the range
    const allDateKeys = generateDateKeys(dateRange.start, dateRange.end, groupBy);

    // Initialize trend map with all dates
    const trendMap = new Map<string, TrendPoint>();
    for (const key of allDateKeys) {
      trendMap.set(key, { date: key, created: 0, resolved: 0, closed: 0 });
    }

    // Count created tickets by period
    for (const ticket of ticketsInRange) {
      if (ticket.createdAt) {
        const key = formatTrendKey(ticket.createdAt, groupBy);
        const point = trendMap.get(key);
        if (point) {
          point.created++;
        }
      }
    }

    // Count resolved tickets by period
    for (const ticket of ticketsResolvedInRange) {
      if (ticket.resolvedAt) {
        const key = formatTrendKey(ticket.resolvedAt, groupBy);
        const point = trendMap.get(key);
        if (point) {
          point.resolved++;
        }
      }
    }

    // Count closed tickets by period
    for (const ticket of ticketsClosedInRange) {
      if (ticket.closedAt) {
        const key = formatTrendKey(ticket.closedAt, groupBy);
        const point = trendMap.get(key);
        if (point) {
          point.closed++;
        }
      }
    }

    // Convert to sorted array
    const trend = allDateKeys.map((key) => trendMap.get(key)!);

    // ==========================================================================
    // Build distribution data
    // ==========================================================================

    const byStatus: StatusDistribution = {} as StatusDistribution;
    for (const { status, count } of statusCounts) {
      byStatus[status] = count;
    }

    const byPriority: PriorityDistribution = {} as PriorityDistribution;
    for (const { priority, count } of priorityCounts) {
      byPriority[priority] = count;
    }

    // ==========================================================================
    // Build peak hours data
    // ==========================================================================

    const hourCounts = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hourCounts.set(h, 0);
    }

    for (const ticket of ticketsInRange) {
      if (ticket.createdAt) {
        const hour = ticket.createdAt.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    }

    const peakHours: PeakHour[] = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    // ==========================================================================
    // Build peak days data
    // ==========================================================================

    const dayCounts = new Map<number, number>();
    for (let d = 0; d < 7; d++) {
      dayCounts.set(d, 0);
    }

    for (const ticket of ticketsInRange) {
      if (ticket.createdAt) {
        const day = ticket.createdAt.getDay(); // 0 = Sunday
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      }
    }

    const peakDays: PeakDay[] = Array.from(dayCounts.entries())
      .map(([day, count]) => ({
        day,
        dayName: DAY_NAMES[day],
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // ==========================================================================
    // Build summary data
    // ==========================================================================

    const totalCreated = ticketsInRange.length;
    const totalResolved = ticketsResolvedInRange.length;
    const totalClosed = ticketsClosedInRange.length;
    const dayCount = getDayCount(dateRange.start, dateRange.end);
    const avgDaily = dayCount > 0 ? Math.round((totalCreated / dayCount) * 10) / 10 : 0;

    // ==========================================================================
    // Build response
    // ==========================================================================

    const response: VolumeReportResponse = {
      trend,
      distribution: {
        byStatus,
        byPriority,
      },
      peakHours,
      peakDays,
      summary: {
        totalCreated,
        totalResolved,
        totalClosed,
        avgDaily,
      },
      dateRange: {
        from: dateRange.start.toISOString(),
        to: dateRange.end.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating volume report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * SLA Compliance Report API
 *
 * GET: Returns SLA compliance metrics for first response and resolution times
 * - Requires SUPERVISOR, ADMIN, or SUPER_ADMIN role
 * - Supports date range filtering (7d, 30d, 90d, or custom)
 * - Returns compliance rates by priority, recent breaches, and breakdown
 *
 * Design Decision (First Response for tickets without firstResponseAt):
 * - Tickets WITHOUT firstResponseAt are EXCLUDED from first response compliance metrics
 * - Rationale: We only measure SLA compliance for tickets that HAVE been responded to
 * - For "pending breach" detection (tickets nearing SLA without response), use a separate endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, type TicketStatus, type TicketPriority } from "@/db";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import { parseDateRange, calculatePercentage } from "@/lib/reports";
import { SLA_DEFAULTS } from "@/lib/sla-config";
import { and, gte, lte } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// TYPES
// =============================================================================

/** Priority breach counts for first response and resolution */
interface PriorityBreaches {
  firstResponse: number;
  resolution: number;
}

/** Compliance metrics for a single SLA category */
interface ComplianceMetrics {
  total: number;
  withinSLA: number;
  breached: number;
  complianceRate: number;
}

/** Recent breach details */
interface RecentBreach {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  breachType: "firstResponse" | "resolution";
  breachTime: number; // minutes OVER the SLA target
  createdAt: string;
}

/** SLA report response shape */
interface SLAReportResponse {
  compliance: {
    firstResponse: ComplianceMetrics;
    resolution: ComplianceMetrics;
  };
  breachesByPriority: {
    URGENT: PriorityBreaches;
    HIGH: PriorityBreaches;
    NORMAL: PriorityBreaches;
  };
  recentBreaches: RecentBreach[];
  dateRange: {
    from: string;
    to: string;
  };
}

/** Ticket with required fields for first response SLA */
interface TicketWithFirstResponse {
  id: string;
  ticketNumber: string;
  subject: string;
  priority: TicketPriority;
  createdAt: Date;
  firstResponseAt: Date;
}

/** Ticket with required fields for resolution SLA */
interface TicketWithResolution {
  id: string;
  ticketNumber: string;
  subject: string;
  priority: TicketPriority;
  createdAt: Date;
  resolvedAt: Date;
}

// =============================================================================
// ALLOWED ROLES
// =============================================================================

const ALLOWED_ROLES = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"] as const;

// =============================================================================
// SLA CALCULATION HELPERS
// =============================================================================

/**
 * Calculate time difference in milliseconds
 */
function getTimeDiffMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

/**
 * Convert hours to milliseconds
 */
function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

/**
 * Convert milliseconds to minutes
 */
function msToMinutes(ms: number): number {
  return Math.round(ms / (1000 * 60));
}

/**
 * Check if first response was within SLA
 * Returns null if firstResponseAt is missing (ticket excluded from metrics)
 */
function isFirstResponseWithinSLA(
  createdAt: Date,
  firstResponseAt: Date | null,
  priority: TicketPriority
): boolean | null {
  if (!firstResponseAt) {
    return null; // Excluded from metrics
  }
  const targetMs = hoursToMs(SLA_DEFAULTS.firstResponseHours[priority]);
  const actualMs = getTimeDiffMs(createdAt, firstResponseAt);
  return actualMs <= targetMs;
}

/**
 * Check if resolution was within SLA
 */
function isResolutionWithinSLA(
  createdAt: Date,
  resolvedAt: Date,
  priority: TicketPriority
): boolean {
  const targetMs = hoursToMs(SLA_DEFAULTS.resolutionHours[priority]);
  const actualMs = getTimeDiffMs(createdAt, resolvedAt);
  return actualMs <= targetMs;
}

/**
 * Calculate breach time in minutes (how much OVER the SLA target)
 */
function calculateBreachTimeMinutes(
  createdAt: Date,
  actualAt: Date,
  targetHours: number
): number {
  const targetMs = hoursToMs(targetHours);
  const actualMs = getTimeDiffMs(createdAt, actualAt);
  const breachMs = actualMs - targetMs;
  return breachMs > 0 ? msToMinutes(breachMs) : 0;
}

// =============================================================================
// GET: SLA Compliance Report
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
    // Only tickets created in the date range count toward SLA compliance
    // ==========================================================================

    const ticketsInRange = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        firstResponseAt: tickets.firstResponseAt,
        resolvedAt: tickets.resolvedAt,
      })
      .from(tickets)
      .where(
        and(
          gte(tickets.createdAt, dateRange.start),
          lte(tickets.createdAt, dateRange.end)
        )
      );

    // ==========================================================================
    // Calculate First Response Compliance
    // Only include tickets that HAVE firstResponseAt
    // ==========================================================================

    // Filter and transform tickets with first response
    const ticketsWithFirstResponse: TicketWithFirstResponse[] = [];
    for (const t of ticketsInRange) {
      if (t.firstResponseAt !== null && t.createdAt !== null && t.priority !== null) {
        ticketsWithFirstResponse.push({
          id: t.id,
          ticketNumber: t.ticketNumber,
          subject: t.subject,
          priority: t.priority,
          createdAt: t.createdAt,
          firstResponseAt: t.firstResponseAt,
        });
      }
    }

    let firstResponseWithinSLA = 0;
    let firstResponseBreached = 0;

    for (const ticket of ticketsWithFirstResponse) {
      const withinSLA = isFirstResponseWithinSLA(
        ticket.createdAt,
        ticket.firstResponseAt,
        ticket.priority
      );
      if (withinSLA === true) {
        firstResponseWithinSLA++;
      } else if (withinSLA === false) {
        firstResponseBreached++;
      }
    }

    const firstResponseTotal = ticketsWithFirstResponse.length;
    const firstResponseComplianceRate = calculatePercentage(
      firstResponseWithinSLA,
      firstResponseTotal,
      1
    );

    // ==========================================================================
    // Calculate Resolution Compliance
    // Only include tickets with status RESOLVED or CLOSED and resolvedAt timestamp
    // ==========================================================================

    const resolvedStatuses: TicketStatus[] = ["RESOLVED", "CLOSED"];

    // Filter and transform resolved tickets
    const resolvedTickets: TicketWithResolution[] = [];
    for (const t of ticketsInRange) {
      if (
        t.resolvedAt !== null &&
        t.createdAt !== null &&
        t.priority !== null &&
        t.status !== null &&
        resolvedStatuses.includes(t.status)
      ) {
        resolvedTickets.push({
          id: t.id,
          ticketNumber: t.ticketNumber,
          subject: t.subject,
          priority: t.priority,
          createdAt: t.createdAt,
          resolvedAt: t.resolvedAt,
        });
      }
    }

    let resolutionWithinSLA = 0;
    let resolutionBreached = 0;

    for (const ticket of resolvedTickets) {
      const withinSLA = isResolutionWithinSLA(
        ticket.createdAt,
        ticket.resolvedAt,
        ticket.priority
      );
      if (withinSLA) {
        resolutionWithinSLA++;
      } else {
        resolutionBreached++;
      }
    }

    const resolutionTotal = resolvedTickets.length;
    const resolutionComplianceRate = calculatePercentage(
      resolutionWithinSLA,
      resolutionTotal,
      1
    );

    // ==========================================================================
    // Calculate Breaches by Priority
    // ==========================================================================

    const breachesByPriority: SLAReportResponse["breachesByPriority"] = {
      URGENT: { firstResponse: 0, resolution: 0 },
      HIGH: { firstResponse: 0, resolution: 0 },
      NORMAL: { firstResponse: 0, resolution: 0 },
    };

    // Count first response breaches by priority
    for (const ticket of ticketsWithFirstResponse) {
      const withinSLA = isFirstResponseWithinSLA(
        ticket.createdAt,
        ticket.firstResponseAt,
        ticket.priority
      );
      if (withinSLA === false) {
        breachesByPriority[ticket.priority].firstResponse++;
      }
    }

    // Count resolution breaches by priority
    for (const ticket of resolvedTickets) {
      const withinSLA = isResolutionWithinSLA(
        ticket.createdAt,
        ticket.resolvedAt,
        ticket.priority
      );
      if (!withinSLA) {
        breachesByPriority[ticket.priority].resolution++;
      }
    }

    // ==========================================================================
    // Get Recent Breaches (limit 10, most recent first)
    // ==========================================================================

    const recentBreaches: RecentBreach[] = [];

    // Collect all breaches with their details
    interface BreachEntry {
      ticketId: string;
      ticketNumber: string;
      subject: string;
      priority: TicketPriority;
      createdAt: Date;
      breachType: "firstResponse" | "resolution";
      breachTime: number;
    }

    const allBreaches: BreachEntry[] = [];

    // First response breaches
    for (const ticket of ticketsWithFirstResponse) {
      const withinSLA = isFirstResponseWithinSLA(
        ticket.createdAt,
        ticket.firstResponseAt,
        ticket.priority
      );
      if (withinSLA === false) {
        const breachTime = calculateBreachTimeMinutes(
          ticket.createdAt,
          ticket.firstResponseAt,
          SLA_DEFAULTS.firstResponseHours[ticket.priority]
        );
        allBreaches.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          breachType: "firstResponse",
          breachTime,
        });
      }
    }

    // Resolution breaches
    for (const ticket of resolvedTickets) {
      const withinSLA = isResolutionWithinSLA(
        ticket.createdAt,
        ticket.resolvedAt,
        ticket.priority
      );
      if (!withinSLA) {
        const breachTime = calculateBreachTimeMinutes(
          ticket.createdAt,
          ticket.resolvedAt,
          SLA_DEFAULTS.resolutionHours[ticket.priority]
        );
        allBreaches.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          breachType: "resolution",
          breachTime,
        });
      }
    }

    // Sort by createdAt DESC and take top 10
    allBreaches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const topBreaches = allBreaches.slice(0, 10);

    for (const breach of topBreaches) {
      recentBreaches.push({
        ticketId: breach.ticketId,
        ticketNumber: breach.ticketNumber,
        subject: breach.subject,
        priority: breach.priority,
        breachType: breach.breachType,
        breachTime: breach.breachTime,
        createdAt: breach.createdAt.toISOString(),
      });
    }

    // ==========================================================================
    // Build Response
    // ==========================================================================

    const response: SLAReportResponse = {
      compliance: {
        firstResponse: {
          total: firstResponseTotal,
          withinSLA: firstResponseWithinSLA,
          breached: firstResponseBreached,
          complianceRate: firstResponseComplianceRate,
        },
        resolution: {
          total: resolutionTotal,
          withinSLA: resolutionWithinSLA,
          breached: resolutionBreached,
          complianceRate: resolutionComplianceRate,
        },
      },
      breachesByPriority,
      recentBreaches,
      dateRange: {
        from: dateRange.start.toISOString(),
        to: dateRange.end.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating SLA report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

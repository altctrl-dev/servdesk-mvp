/**
 * Team Performance Report API
 *
 * GET: Returns team performance metrics for agents
 * - Requires SUPERVISOR, ADMIN, or SUPER_ADMIN role
 * - Supports date range filtering (7d, 30d, 90d, or custom)
 * - Returns per-agent metrics and summary totals
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, type TicketStatus } from "@/db";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import {
  parseDateRange,
  calculateAvgResponseTime,
  calculateAvgResolutionTime,
} from "@/lib/reports";
import { and, or, inArray, gte, lte, count } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// TYPES
// =============================================================================

/** Agent row from raw SQL query (joining user with user_profiles) */
interface AgentRow {
  id: string;
  email: string;
  name: string | null;
  isActive: number | null;
}

/** Ticket data for metrics calculation */
interface TicketMetrics {
  id: string;
  assignedToId: string | null;
  createdAt: Date | null;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

/** Per-agent performance data */
interface AgentPerformance {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  ticketsHandled: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  currentWorkload: number;
}

/** Team report response shape */
interface TeamReportResponse {
  agents: AgentPerformance[];
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
// ALLOWED ROLES
// =============================================================================

const ALLOWED_ROLES = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"] as const;

// =============================================================================
// GET: Team Performance Report
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
    // Fetch all agents (users with AGENT role or higher)
    // ==========================================================================

    // Query all users with their active status using D1 directly
    // This gets users who are agents (could have AGENT role or be assigned tickets)
    const agentQuery = await typedEnv.DB.prepare(`
      SELECT
        u.id,
        u.email,
        u.name,
        COALESCE(up.is_active, 1) as isActive
      FROM user u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = u.id
        AND r.name IN ('AGENT', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
      )
      ORDER BY u.name ASC
    `).all<AgentRow>();

    const agents = agentQuery.results || [];

    // ==========================================================================
    // Fetch handled tickets within date range
    // Handled = agent was assigned when status changed to RESOLVED or CLOSED
    // ==========================================================================

    const resolvedStatuses: TicketStatus[] = ["RESOLVED", "CLOSED"];

    const handledTickets = await db
      .select({
        id: tickets.id,
        assignedToId: tickets.assignedToId,
        createdAt: tickets.createdAt,
        firstResponseAt: tickets.firstResponseAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .where(
        and(
          inArray(tickets.status, resolvedStatuses),
          or(
            // Resolved within date range
            and(
              gte(tickets.resolvedAt, dateRange.start),
              lte(tickets.resolvedAt, dateRange.end)
            ),
            // Or closed within date range
            and(
              gte(tickets.closedAt, dateRange.start),
              lte(tickets.closedAt, dateRange.end)
            )
          )
        )
      );

    // ==========================================================================
    // Fetch current workload (open tickets assigned to each agent)
    // ==========================================================================

    const openStatuses: TicketStatus[] = ["NEW", "OPEN", "PENDING_CUSTOMER", "ON_HOLD"];

    const workloadResults = await db
      .select({
        assignedToId: tickets.assignedToId,
        count: count(),
      })
      .from(tickets)
      .where(inArray(tickets.status, openStatuses))
      .groupBy(tickets.assignedToId);

    // Build workload map
    const workloadMap = new Map<string, number>();
    for (const row of workloadResults) {
      if (row.assignedToId) {
        workloadMap.set(row.assignedToId, row.count);
      }
    }

    // ==========================================================================
    // Calculate per-agent metrics
    // ==========================================================================

    // Group handled tickets by assignedToId
    const ticketsByAgent = new Map<string, TicketMetrics[]>();
    for (const ticket of handledTickets) {
      if (ticket.assignedToId) {
        const existing = ticketsByAgent.get(ticket.assignedToId) || [];
        existing.push(ticket);
        ticketsByAgent.set(ticket.assignedToId, existing);
      }
    }

    // Build agent performance data
    const agentPerformance: AgentPerformance[] = agents.map((agent) => {
      const agentTickets = ticketsByAgent.get(agent.id) || [];
      const ticketsHandled = agentTickets.length;
      const avgResponseTime = calculateAvgResponseTime(agentTickets);
      const avgResolutionTime = calculateAvgResolutionTime(agentTickets);
      const currentWorkload = workloadMap.get(agent.id) || 0;

      return {
        id: agent.id,
        name: agent.name || "Unknown",
        email: agent.email,
        isActive: Boolean(agent.isActive ?? 1),
        ticketsHandled,
        avgResponseTime,
        avgResolutionTime,
        currentWorkload,
      };
    });

    // ==========================================================================
    // Calculate summary metrics
    // ==========================================================================

    const totalTicketsHandled = handledTickets.length;
    const summaryAvgResponseTime = calculateAvgResponseTime(handledTickets);
    const summaryAvgResolutionTime = calculateAvgResolutionTime(handledTickets);

    // Total open tickets (sum of all workloads)
    let totalOpenTickets = 0;
    for (const count of workloadMap.values()) {
      totalOpenTickets += count;
    }

    // ==========================================================================
    // Build response
    // ==========================================================================

    const response: TeamReportResponse = {
      agents: agentPerformance,
      summary: {
        totalTicketsHandled,
        avgResponseTime: summaryAvgResponseTime,
        avgResolutionTime: summaryAvgResolutionTime,
        totalOpenTickets,
      },
      dateRange: {
        from: dateRange.start.toISOString(),
        to: dateRange.end.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating team report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

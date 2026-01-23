/**
 * Ticket Details API Route
 *
 * GET: Get ticket details with messages and optional audit logs
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers, messages, auditLogs } from "@/db";
import {
  getSessionWithRole,
  canViewAllTickets,
  canViewAuditLogs,
} from "@/lib/rbac";
import { eq, desc, asc } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// GET: Get Ticket Details
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;

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

    // Get database
    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Get ticket with customer info
    const [ticket] = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        trackingToken: tickets.trackingToken,
        assignedToId: tickets.assignedToId,
        emailThreadId: tickets.emailThreadId,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        firstResponseAt: tickets.firstResponseAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
        customer: {
          id: customers.id,
          email: customers.email,
          name: customers.name,
          organization: customers.organization,
          ticketCount: customers.ticketCount,
        },
      })
      .from(tickets)
      .leftJoin(customers, eq(tickets.customerId, customers.id))
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Authorization check: AGENT users can only see their assigned tickets
    if (!canViewAllTickets(session.roles)) {
      if (ticket.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: You do not have access to this ticket" },
          { status: 403 }
        );
      }
    }

    // Get messages for the ticket
    const ticketMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.ticketId, ticketId))
      .orderBy(asc(messages.createdAt));

    // Filter internal messages for AGENT users
    // All authenticated users can see internal notes (per requirements)
    // If you want to restrict, uncomment below:
    // const filteredMessages = session.role === "AGENT"
    //   ? ticketMessages.filter(m => m.type !== "INTERNAL")
    //   : ticketMessages;

    // Check if audit logs should be included
    const { searchParams } = new URL(request.url);
    const includeAuditLogs = searchParams.get("includeAuditLogs") === "true";

    let audit = null;
    if (includeAuditLogs && canViewAuditLogs(session.roles)) {
      audit = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.ticketId, ticketId))
        .orderBy(desc(auditLogs.createdAt));
    }

    return NextResponse.json({
      ticket,
      messages: ticketMessages,
      auditLogs: audit,
    });
  } catch (error) {
    console.error("Error getting ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

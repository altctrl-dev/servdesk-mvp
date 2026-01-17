/**
 * Ticket Status API Route
 *
 * PATCH: Change ticket status with workflow validation
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets } from "@/db";
import { requireRole } from "@/lib/rbac";
import { ticketStatusChangeSchema, safeValidate } from "@/lib/validations";
import {
  validateStatusTransition,
  getValidNextStatuses,
} from "@/lib/tickets";
import { logTicketStatusChanged } from "@/lib/audit";
import { eq } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketStatus } from "@/db/schema";

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// PATCH: Change Ticket Status
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;

    // Require SUPER_ADMIN or ADMIN role
    let session;
    try {
      session = await requireRole(["SUPER_ADMIN", "ADMIN"]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      const status = message.includes("Forbidden") ? 403 : 401;
      return NextResponse.json({ error: message }, { status });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = safeValidate(ticketStatusChangeSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    const { status: newStatus } = validation.data;

    // Get database
    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Get current ticket
    const [ticket] = await db
      .select({
        id: tickets.id,
        status: tickets.status,
        ticketNumber: tickets.ticketNumber,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const currentStatus = ticket.status as TicketStatus;

    // Validate status transition
    const transitionResult = validateStatusTransition(currentStatus, newStatus);
    if (!transitionResult.isValid) {
      return NextResponse.json(
        {
          error: transitionResult.error,
          currentStatus,
          validNextStatuses: getValidNextStatuses(currentStatus),
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Track resolution and closure times
    if (newStatus === "RESOLVED" && currentStatus !== "RESOLVED") {
      updateData.resolvedAt = new Date();
    }

    if (newStatus === "CLOSED" && currentStatus !== "CLOSED") {
      updateData.closedAt = new Date();
    }

    // Clear resolution time if reopening
    if (newStatus === "OPEN" && currentStatus === "RESOLVED") {
      updateData.resolvedAt = null;
    }

    // Clear closure time if reopening
    if (newStatus === "OPEN" && currentStatus === "CLOSED") {
      updateData.closedAt = null;
      // Also clear resolved if it was set
      updateData.resolvedAt = null;
    }

    // Update ticket
    const [updatedTicket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId))
      .returning();

    // Create audit log
    await logTicketStatusChanged(
      db,
      ticketId,
      session.user.id,
      session.user.email,
      currentStatus,
      newStatus
    );

    return NextResponse.json({
      ticket: updatedTicket,
      previousStatus: currentStatus,
    });
  } catch (error) {
    console.error("Error changing ticket status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Ticket Assignment API Route
 *
 * PATCH: Assign a ticket to a user (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets } from "@/db";
import { requireRole } from "@/lib/rbac";
import { ticketAssignSchema, safeValidate } from "@/lib/validations";
import { logTicketAssigned } from "@/lib/audit";
import { eq } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// PATCH: Assign Ticket to User
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;

    // Require SUPER_ADMIN role
    let session;
    try {
      session = await requireRole(["SUPER_ADMIN"]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      const status = message.includes("Forbidden") ? 403 : 401;
      return NextResponse.json({ error: message }, { status });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = safeValidate(ticketAssignSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    const { userId: assignToUserId } = validation.data;

    // Get database
    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Get current ticket
    const [ticket] = await db
      .select({
        id: tickets.id,
        assignedToId: tickets.assignedToId,
        ticketNumber: tickets.ticketNumber,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verify the target user exists and is active (also get their email for audit log)
    const typedEnv = env as CloudflareEnv;
    const targetUserResult = await typedEnv.DB.prepare(`
      SELECT u.email, u.name, up.role, up.is_active as isActive
      FROM user u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?1
      LIMIT 1
    `).bind(assignToUserId).first<{ email: string; name: string | null; role: string | null; isActive: number | null }>();

    if (!targetUserResult) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    if (!targetUserResult.isActive) {
      return NextResponse.json(
        { error: "Cannot assign ticket to inactive user" },
        { status: 400 }
      );
    }

    // Get old assignee's email for audit log (if there was a previous assignee)
    let oldAssigneeEmail: string | null = null;
    if (ticket.assignedToId) {
      const oldAssigneeResult = await typedEnv.DB.prepare(`
        SELECT email FROM user WHERE id = ?1 LIMIT 1
      `).bind(ticket.assignedToId).first<{ email: string }>();
      oldAssigneeEmail = oldAssigneeResult?.email || null;
    }

    // Check if already assigned to the same user
    if (ticket.assignedToId === assignToUserId) {
      return NextResponse.json({
        ticket,
        message: "Ticket is already assigned to this user",
      });
    }

    // Update ticket assignment
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        assignedToId: assignToUserId,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    // Create audit log with user emails for readability
    await logTicketAssigned(
      db,
      ticketId,
      session.user.id,
      session.user.email,
      oldAssigneeEmail,
      targetUserResult.email
    );

    return NextResponse.json({
      ticket: updatedTicket,
      previousAssignee: ticket.assignedToId,
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

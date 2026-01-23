/**
 * Ticket Reply API Route
 *
 * POST: Add a reply or internal note to a ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, messages, customers } from "@/db";
import { requireAuth, canViewAllTickets } from "@/lib/rbac";
import { ticketReplySchema, safeValidate } from "@/lib/validations";
import { logMessageAdded } from "@/lib/audit";
import { sendTicketReplyEmail } from "@/lib/resend";
import { eq } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketStatus } from "@/db/schema";

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// POST: Add Reply to Ticket
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;

    // Require authentication (any role can reply)
    let session;
    try {
      session = await requireAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = safeValidate(ticketReplySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    const { content, type } = validation.data;

    // Get database
    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Get ticket to verify it exists and check authorization
    const [ticket] = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        trackingToken: tickets.trackingToken,
        assignedToId: tickets.assignedToId,
        customerId: tickets.customerId,
        firstResponseAt: tickets.firstResponseAt,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // AGENT users can only reply to tickets assigned to them
    if (!canViewAllTickets(session.roles)) {
      if (ticket.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: You do not have access to this ticket" },
          { status: 403 }
        );
      }
    }

    // Get customer for outbound messages
    let customerData: { email: string; name: string | null } | null = null;
    if (type === "OUTBOUND") {
      const [customer] = await db
        .select({ email: customers.email, name: customers.name })
        .from(customers)
        .where(eq(customers.id, ticket.customerId))
        .limit(1);

      if (customer) {
        customerData = customer;
      }
    }

    // Create message
    const [newMessage] = await db
      .insert(messages)
      .values({
        ticketId,
        type,
        content,
        authorId: session.user.id,
        toEmail: type === "OUTBOUND" ? customerData?.email ?? null : null,
      })
      .returning();

    // Update ticket timestamps
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Track first response if this is the first agent reply
    if (type === "OUTBOUND" && !ticket.firstResponseAt) {
      updateData.firstResponseAt = new Date();
    }

    await db.update(tickets).set(updateData).where(eq(tickets.id, ticketId));

    // Create audit log
    await logMessageAdded(
      db,
      ticketId,
      newMessage.id,
      session.user.id,
      session.user.email,
      type
    );

    // Send email notification to customer for OUTBOUND replies
    if (type === "OUTBOUND" && customerData) {
      try {
        const typedEnv = env as CloudflareEnv;
        if (typedEnv.RESEND_API_KEY && typedEnv.SUPPORT_EMAIL_FROM) {
          await sendTicketReplyEmail(typedEnv, {
            ticket: {
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              status: ticket.status as TicketStatus,
              trackingToken: ticket.trackingToken,
            },
            customer: {
              email: customerData.email,
              name: customerData.name,
            },
            message: {
              content,
              fromName: session.user.name || session.user.email,
            },
          });
        } else {
          console.log("Email notification skipped: RESEND_API_KEY or SUPPORT_EMAIL_FROM not configured");
        }
      } catch (emailError) {
        // Log error but don't fail the request - message was saved successfully
        console.error("Failed to send reply email notification:", emailError);
      }
    }

    return NextResponse.json(
      {
        message: newMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding reply:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

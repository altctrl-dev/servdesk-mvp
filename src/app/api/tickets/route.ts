/**
 * Tickets API Route
 *
 * GET: List tickets with filtering and pagination
 * POST: Create a new ticket (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers, messages } from "@/db";
import { getSessionWithRole, canViewAllTickets, requireRole } from "@/lib/rbac";
import {
  ticketFilterSchema,
  createTicketSchema,
  safeValidate,
} from "@/lib/validations";
import { generateTicketNumber, generateTrackingToken } from "@/lib/tickets";
import { logTicketCreated } from "@/lib/audit";
import { eq, desc, and, like, or, sql, count } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

// =============================================================================
// GET: List Tickets
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filterInput = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    };

    const validation = safeValidate(ticketFilterSchema, filterInput);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Invalid parameters: ${validation.error}` },
        { status: 400 }
      );
    }

    const filters = validation.data;
    const offset = (filters.page - 1) * filters.limit;

    // Get database
    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Build where conditions
    const conditions = [];

    // Role-based filtering
    if (!canViewAllTickets(session.role)) {
      // VIEW_ONLY users can only see tickets assigned to them
      conditions.push(eq(tickets.assignedToId, session.user.id));
    }

    // Status filter
    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status));
    }

    // Priority filter
    if (filters.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }

    // Assigned to filter (admin override for any assignment)
    if (filters.assignedTo) {
      conditions.push(eq(tickets.assignedToId, filters.assignedTo));
    }

    // Search filter (searches subject and ticket number)
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(tickets.subject, searchTerm),
          like(tickets.ticketNumber, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(tickets)
      .where(whereClause);

    const total = totalResult?.count || 0;

    // Get tickets with customer info
    const ticketList = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        assignedToId: tickets.assignedToId,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        customer: {
          id: customers.id,
          email: customers.email,
          name: customers.name,
        },
      })
      .from(tickets)
      .leftJoin(customers, eq(tickets.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(tickets.createdAt))
      .limit(filters.limit)
      .offset(offset);

    return NextResponse.json({
      tickets: ticketList,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error listing tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create Ticket (Manual creation by SUPER_ADMIN)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
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
    const validation = safeValidate(createTicketSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    const { customerId, subject, content, priority } = validation.data;

    // Get database
    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Verify customer exists
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Generate ticket number and tracking token
    const ticketNumber = generateTicketNumber();
    const trackingToken = generateTrackingToken();

    // Create ticket
    const [newTicket] = await db
      .insert(tickets)
      .values({
        ticketNumber,
        trackingToken,
        customerId,
        subject,
        priority,
        status: "NEW",
      })
      .returning();

    // Create initial message
    const [newMessage] = await db
      .insert(messages)
      .values({
        ticketId: newTicket.id,
        type: "INBOUND", // Treat manual creation as inbound message
        content,
        fromEmail: customer.email,
        fromName: customer.name,
        authorId: session.user.id, // Record who created it
      })
      .returning();

    // Update customer ticket count
    await db
      .update(customers)
      .set({
        ticketCount: sql`${customers.ticketCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    // Create audit log
    await logTicketCreated(db, newTicket.id, session.user.id, session.user.email, {
      source: "manual",
      subject,
      priority,
    });

    return NextResponse.json(
      {
        ticket: {
          ...newTicket,
          customer,
        },
        message: newMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

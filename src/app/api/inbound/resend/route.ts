/**
 * Resend Inbound Email Webhook Handler
 *
 * POST: Receives inbound emails from Resend and processes them as:
 * - New ticket creation (if no ticket number in subject)
 * - Reply to existing ticket (if ticket number found in subject)
 *
 * Security:
 * - Webhook signature verification (HMAC-SHA256)
 * - Idempotency via inboundEvents table
 * - Rate limiting by IP address
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import {
  getDb,
  tickets,
  customers,
  messages,
  inboundEvents,
  userProfiles,
} from "@/db";
import { generateTicketNumber, generateTrackingToken } from "@/lib/tickets";
import { logTicketCreated, logMessageAdded, logTicketStatusChanged } from "@/lib/audit";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import {
  verifyWebhookSignature,
  parseInboundEmail,
  extractTicketNumber,
  extractReplyContent,
  sendTicketCreatedEmail,
  sendAdminNotificationEmail,
} from "@/lib/resend";
import { eq, sql } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketStatus } from "@/db/schema";

export const runtime = 'edge';

// Rate limit: 30 requests per minute per IP for webhook endpoints
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// =============================================================================
// POST: Handle Inbound Email Webhook
// =============================================================================

export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext();
  const typedEnv = env as CloudflareEnv;

  // Rate limiting by IP
  const clientIp = getClientIp(request);
  const rateLimitResult = await checkRateLimit(
    typedEnv.RATE_LIMIT,
    `inbound:${clientIp}`,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT_REQUESTS),
      }
    );
  }

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get("resend-signature") || "";
    const isValidSignature = await verifyWebhookSignature(
      rawBody,
      signature,
      typedEnv.RESEND_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Invalid JSON payload");
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Parse the inbound email
    const email = parseInboundEmail(payload);
    if (!email) {
      console.error("Failed to parse inbound email");
      return NextResponse.json(
        { error: "Invalid email payload" },
        { status: 400 }
      );
    }

    const db = getDb(typedEnv.DB);

    // Idempotency check - has this message already been processed?
    const [existingEvent] = await db
      .select()
      .from(inboundEvents)
      .where(eq(inboundEvents.resendMessageId, email.messageId))
      .limit(1);

    if (existingEvent) {
      // Already processed - return success to prevent retries
      console.log(`Duplicate webhook for message ${email.messageId}, skipping`);
      return NextResponse.json({
        success: true,
        duplicate: true,
        ticketId: existingEvent.ticketId,
      });
    }

    // Create inbound event record for idempotency
    const [inboundEvent] = await db
      .insert(inboundEvents)
      .values({
        resendMessageId: email.messageId,
        payload: rawBody,
        processed: false,
      })
      .returning();

    // Extract ticket number from subject
    const ticketNumber = extractTicketNumber(email.subject);
    const replyContent = extractReplyContent(email.textBody);

    let ticketId: string;
    let isNewTicket = false;

    if (ticketNumber) {
      // This is a reply to an existing ticket
      ticketId = await handleExistingTicketReply(
        db,
        typedEnv,
        email,
        ticketNumber,
        replyContent
      );
    } else {
      // This is a new ticket
      const result = await handleNewTicket(db, typedEnv, email, replyContent);
      ticketId = result.ticketId;
      isNewTicket = true;
    }

    // Mark inbound event as processed
    await db
      .update(inboundEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        ticketId,
      })
      .where(eq(inboundEvents.id, inboundEvent.id));

    return NextResponse.json({
      success: true,
      ticketId,
      isNewTicket,
    });
  } catch (error) {
    console.error("Error processing inbound email:", error);

    // Return 200 to prevent Resend from retrying for application errors
    // The error is logged and can be investigated
    return NextResponse.json(
      {
        success: false,
        error: "Internal processing error",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Handles a reply to an existing ticket.
 */
async function handleExistingTicketReply(
  db: ReturnType<typeof getDb>,
  env: CloudflareEnv,
  email: ReturnType<typeof parseInboundEmail> & {},
  ticketNumber: string,
  replyContent: string
): Promise<string> {
  // Find the ticket by ticket number
  const [ticket] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      customerId: tickets.customerId,
      trackingToken: tickets.trackingToken,
    })
    .from(tickets)
    .where(eq(tickets.ticketNumber, ticketNumber))
    .limit(1);

  if (!ticket) {
    // Ticket not found - treat as new ticket instead
    console.warn(`Ticket ${ticketNumber} not found, creating new ticket`);
    const result = await handleNewTicket(db, env, email, replyContent);
    return result.ticketId;
  }

  // Find or create customer - ensures the replying email is tracked even if different
  // from original ticket creator. This also updates the customer's name if previously unknown.
  await findOrCreateCustomer(db, email.from.email, email.from.name);

  // Create inbound message
  const [newMessage] = await db
    .insert(messages)
    .values({
      ticketId: ticket.id,
      type: "INBOUND",
      content: replyContent,
      contentHtml: email.htmlBody,
      fromEmail: email.from.email,
      fromName: email.from.name,
    })
    .returning();

  // Update ticket - reopen if it was pending customer response
  const currentStatus = ticket.status as TicketStatus;
  let newStatus = currentStatus;

  if (currentStatus === "PENDING_CUSTOMER") {
    newStatus = "OPEN";
    await db
      .update(tickets)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticket.id));

    // Log status change
    await logTicketStatusChanged(
      db,
      ticket.id,
      undefined, // No user ID for email-based actions
      email.from.email,
      currentStatus,
      newStatus
    );
  } else {
    // Just update the timestamp
    await db
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, ticket.id));
  }

  // Log message added
  await logMessageAdded(
    db,
    ticket.id,
    newMessage.id,
    undefined,
    email.from.email,
    "INBOUND"
  );

  return ticket.id;
}

/**
 * Handles creation of a new ticket from an inbound email.
 */
async function handleNewTicket(
  db: ReturnType<typeof getDb>,
  env: CloudflareEnv,
  email: ReturnType<typeof parseInboundEmail> & {},
  replyContent: string
): Promise<{ ticketId: string; ticketNumber: string }> {
  // Find or create customer
  const customer = await findOrCreateCustomer(db, email.from.email, email.from.name);

  // Generate ticket identifiers
  const newTicketNumber = generateTicketNumber();
  const trackingToken = generateTrackingToken();

  // Clean up subject (remove Re:, Fwd:, etc.)
  let subject = email.subject
    .replace(/^(Re:|Fwd:|FW:|RE:|FWD:)\s*/gi, "")
    .trim();

  // Ensure subject is not empty
  if (!subject) {
    subject = "Support Request";
  }

  // Truncate if too long
  if (subject.length > 255) {
    subject = subject.substring(0, 252) + "...";
  }

  // Create ticket
  const [newTicket] = await db
    .insert(tickets)
    .values({
      ticketNumber: newTicketNumber,
      trackingToken,
      customerId: customer.id,
      subject,
      status: "NEW",
      priority: "NORMAL",
    })
    .returning();

  // Create initial message
  const [newMessage] = await db
    .insert(messages)
    .values({
      ticketId: newTicket.id,
      type: "INBOUND",
      content: replyContent || email.textBody,
      contentHtml: email.htmlBody,
      fromEmail: email.from.email,
      fromName: email.from.name,
    })
    .returning();

  // Update customer ticket count
  await db
    .update(customers)
    .set({
      ticketCount: sql`${customers.ticketCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customer.id));

  // Create audit log
  await logTicketCreated(db, newTicket.id, undefined, email.from.email, {
    source: "email",
    subject,
    fromEmail: email.from.email,
  });

  // Log message added
  await logMessageAdded(
    db,
    newTicket.id,
    newMessage.id,
    undefined,
    email.from.email,
    "INBOUND"
  );

  // Send confirmation email to customer
  const ticketEmailData = {
    ticketNumber: newTicket.ticketNumber,
    subject: newTicket.subject,
    status: newTicket.status as "NEW",
    trackingToken: newTicket.trackingToken,
  };

  const customerEmailData = {
    email: customer.email,
    name: customer.name,
  };

  await sendTicketCreatedEmail(env, {
    ticket: ticketEmailData,
    customer: customerEmailData,
  });

  // Send notification to all admins
  const admins = await getAdminUsers(db);
  if (admins.length > 0) {
    await sendAdminNotificationEmail(env, {
      ticket: ticketEmailData,
      customer: customerEmailData,
      admins,
      initialMessage: replyContent || email.textBody,
    });
  }

  return {
    ticketId: newTicket.id,
    ticketNumber: newTicket.ticketNumber,
  };
}

/**
 * Finds an existing customer by email or creates a new one.
 */
async function findOrCreateCustomer(
  db: ReturnType<typeof getDb>,
  email: string,
  name?: string
): Promise<{ id: string; email: string; name: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try to find existing customer
  const [existing] = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
    })
    .from(customers)
    .where(eq(customers.email, normalizedEmail))
    .limit(1);

  if (existing) {
    // Update name if not set and we have one now
    if (!existing.name && name) {
      await db
        .update(customers)
        .set({ name, updatedAt: new Date() })
        .where(eq(customers.id, existing.id));
      return { ...existing, name };
    }
    return existing;
  }

  // Create new customer
  const [newCustomer] = await db
    .insert(customers)
    .values({
      email: normalizedEmail,
      name: name || null,
    })
    .returning();

  return {
    id: newCustomer.id,
    email: newCustomer.email,
    name: newCustomer.name,
  };
}

/**
 * Gets all admin users (SUPER_ADMIN and ADMIN roles) for notifications.
 */
async function getAdminUsers(
  db: ReturnType<typeof getDb>
): Promise<Array<{ email: string; name?: string }>> {
  // We need to join with Better Auth's user table
  // Since we're using Drizzle, we need to query the raw user table
  // Better Auth stores users in the 'user' table

  try {
    // Query userProfiles to get admin user IDs
    const adminProfiles = await db
      .select({
        userId: userProfiles.userId,
        role: userProfiles.role,
      })
      .from(userProfiles)
      .where(
        sql`${userProfiles.role} IN ('SUPER_ADMIN', 'ADMIN') AND ${userProfiles.isActive} = 1`
      );

    if (adminProfiles.length === 0) {
      return [];
    }

    // Get user details from Better Auth's user table using Drizzle's raw query
    // Build a safe parameterized query
    const userIds = adminProfiles.map((p) => p.userId);

    // Use Drizzle's sql template for safe parameterized queries
    // Build the IN clause with proper parameterization
    const results = await db.all<{ id: string; email: string; name: string | null }>(
      sql`SELECT id, email, name FROM user WHERE id IN (${sql.join(
        userIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((row) => ({
      email: row.email,
      name: row.name || undefined,
    }));
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return [];
  }
}

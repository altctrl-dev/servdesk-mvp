/**
 * Public Ticket Tracking API Route
 *
 * GET: Track ticket status (no auth required)
 *      - By ticket number + email
 *      - By tracking token
 *
 * Rate limited: 10 requests per minute per IP
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers, messages } from "@/db";
import {
  ticketTrackByEmailSchema,
  ticketTrackByTokenSchema,
} from "@/lib/validations";
import {
  checkRateLimit,
  rateLimitHeaders,
  getClientIp,
} from "@/lib/rate-limit";
import { eq, and, desc } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

// Rate limit configuration: 10 requests per minute
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

// =============================================================================
// GET: Track Ticket (Public, Rate Limited)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get Cloudflare context for rate limiting KV
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;

    // Rate limit check
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(
      typedEnv.RATE_LIMIT,
      `track:${clientIp}`,
      RATE_LIMIT,
      RATE_WINDOW_MS
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT),
        }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const ticketNumber = searchParams.get("ticketNumber");
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    // Validate input - need either token OR (ticketNumber + email)
    let trackingMethod: "token" | "email" | null = null;

    if (token) {
      const validation = ticketTrackByTokenSchema.safeParse({ token });
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid tracking token" },
          {
            status: 400,
            headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT),
          }
        );
      }
      trackingMethod = "token";
    } else if (ticketNumber && email) {
      const validation = ticketTrackByEmailSchema.safeParse({
        ticketNumber,
        email,
      });
      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        return NextResponse.json(
          { error: `Validation failed: ${errors}` },
          {
            status: 400,
            headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT),
          }
        );
      }
      trackingMethod = "email";
    } else {
      return NextResponse.json(
        {
          error:
            "Please provide either a tracking token OR both ticket number and email",
        },
        {
          status: 400,
          headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT),
        }
      );
    }

    // Get database
    const db = getDb(typedEnv.DB);

    // Find ticket based on tracking method
    let ticket;

    if (trackingMethod === "token") {
      // Track by token
      const [result] = await db
        .select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          subject: tickets.subject,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
        })
        .from(tickets)
        .where(eq(tickets.trackingToken, token!))
        .limit(1);

      ticket = result;
    } else {
      // Track by ticket number + email
      // First find customer by email, then match ticket
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, email!.toLowerCase()))
        .limit(1);

      if (!customer) {
        // Don't reveal whether email exists - use generic message
        return NextResponse.json(
          { error: "Ticket not found" },
          {
            status: 404,
            headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT),
          }
        );
      }

      const [result] = await db
        .select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          subject: tickets.subject,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.ticketNumber, ticketNumber!),
            eq(tickets.customerId, customer.id)
          )
        )
        .limit(1);

      ticket = result;
    }

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        {
          status: 404,
          headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT),
        }
      );
    }

    // Get messages to find last public message (INBOUND or OUTBOUND, not INTERNAL or SYSTEM)
    const publicMessages = await db
      .select({
        id: messages.id,
        type: messages.type,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.ticketId, ticket.id))
      .orderBy(desc(messages.createdAt));

    const lastPublic = publicMessages.find(
      (m) => m.type === "INBOUND" || m.type === "OUTBOUND"
    );

    // Build safe public response (no internal details)
    const publicTicketInfo = {
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastMessage: lastPublic
        ? {
            type: lastPublic.type,
            // Truncate content for privacy
            preview:
              lastPublic.content.length > 200
                ? lastPublic.content.substring(0, 200) + "..."
                : lastPublic.content,
            createdAt: lastPublic.createdAt,
          }
        : null,
    };

    return NextResponse.json(
      { ticket: publicTicketInfo },
      { headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT) }
    );
  } catch (error) {
    console.error("Error tracking ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

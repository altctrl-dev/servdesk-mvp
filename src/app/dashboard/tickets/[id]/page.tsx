/**
 * Ticket Detail Page
 *
 * Displays full ticket information including:
 * - Ticket header with status and priority badges
 * - Message thread (chronological)
 * - Reply composer
 * - Ticket info panel (sidebar)
 * - Audit log (for admins)
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers, messages, auditLogs } from "@/db";
import {
  getSessionWithRole,
  canViewAllTickets,
  canViewAuditLogs,
  canAssignTickets,
} from "@/lib/rbac";
import { eq, asc, desc } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import {
  StatusBadge,
  PriorityBadge,
  MessageThread,
  ReplyComposer,
  TicketInfoPanel,
  AuditLog,
} from "@/components/admin";

export const runtime = 'edge';

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

async function getTicketData(ticketId: string, session: NonNullable<Awaited<ReturnType<typeof getSessionWithRole>>>) {
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
    return null;
  }

  // Authorization check: AGENT users can only see their assigned tickets
  if (!canViewAllTickets(session.roles)) {
    if (ticket.assignedToId !== session.user.id) {
      return null;
    }
  }

  // Get messages for the ticket
  const ticketMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.ticketId, ticketId))
    .orderBy(asc(messages.createdAt));

  // Get audit logs if user has permission
  let audit = null;
  if (canViewAuditLogs(session.roles)) {
    const rawAuditLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.ticketId, ticketId))
      .orderBy(desc(auditLogs.createdAt));

    // For "assigned" entries, oldValue/newValue may contain user IDs
    // We need to resolve these to emails for display
    const userIdsToResolve = new Set<string>();
    for (const log of rawAuditLogs) {
      if (log.action === "assigned") {
        // Check if oldValue/newValue look like user IDs (not emails)
        if (log.oldValue && !log.oldValue.includes("@")) {
          userIdsToResolve.add(log.oldValue);
        }
        if (log.newValue && !log.newValue.includes("@")) {
          userIdsToResolve.add(log.newValue);
        }
      }
    }

    // If there are user IDs to resolve, fetch their emails
    const userIdToEmail = new Map<string, string>();
    if (userIdsToResolve.size > 0) {
      const userIds = Array.from(userIdsToResolve);
      // Query users table to get emails for these IDs
      const placeholders = userIds.map(() => "?").join(",");
      const usersResult = await (env as CloudflareEnv).DB.prepare(
        `SELECT id, email FROM user WHERE id IN (${placeholders})`
      ).bind(...userIds).all<{ id: string; email: string }>();

      if (usersResult.results) {
        for (const user of usersResult.results) {
          userIdToEmail.set(user.id, user.email);
        }
      }
    }

    // Replace user IDs with emails in audit log entries
    audit = rawAuditLogs.map((log) => {
      if (log.action === "assigned") {
        return {
          ...log,
          oldValue: log.oldValue && !log.oldValue.includes("@")
            ? userIdToEmail.get(log.oldValue) || log.oldValue
            : log.oldValue,
          newValue: log.newValue && !log.newValue.includes("@")
            ? userIdToEmail.get(log.newValue) || log.newValue
            : log.newValue,
        };
      }
      return log;
    });
  }

  // Fetch assignee info and attach to ticket object
  let assignee: { id: string; email: string; name: string | null } | null = null;
  if (ticket.assignedToId) {
    const assigneeResult = await (env as CloudflareEnv).DB.prepare(
      `SELECT u.id, u.email, u.name FROM user u WHERE u.id = ?1 LIMIT 1`
    ).bind(ticket.assignedToId).first<{ id: string; email: string; name: string | null }>();

    if (assigneeResult) {
      assignee = assigneeResult;
    }
  }

  return {
    ticket: { ...ticket, assignee },
    messages: ticketMessages,
    auditLogs: audit,
  };
}

export default async function TicketDetailPage({ params }: TicketPageProps) {
  const { id } = await params;
  const session = await getSessionWithRole();

  if (!session) {
    notFound();
  }

  const data = await getTicketData(id, session);

  if (!data) {
    notFound();
  }

  const { ticket, messages: ticketMessages, auditLogs: audit } = data;
  const canChangeStatus = canViewAllTickets(session.roles);
  const canAssign = canAssignTickets(session.roles);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to dashboard</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-xl font-semibold mt-1">{ticket.subject}</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Message thread and reply */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MessageThread
                messages={ticketMessages}
                className="border-t"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <ReplyComposer ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TicketInfoPanel
            ticket={ticket}
            canChangeStatus={canChangeStatus}
            canAssign={canAssign}
          />

          {audit && audit.length > 0 && (
            <AuditLog logs={audit} />
          )}
        </div>
      </div>
    </div>
  );
}

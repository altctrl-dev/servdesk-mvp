/**
 * My Queue Page
 *
 * Displays tickets assigned to the current user with active statuses.
 * Accessible to all authenticated roles.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, desc, and, like, or, count, inArray } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketStatus, TicketPriority, UserRole } from "@/db/schema";
import {
  TicketFilters,
  TicketTable,
  TicketTableSkeleton,
} from "@/components/admin";

export const runtime = "edge";

// All authenticated roles can access this page
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// Active ticket statuses for inbox queues
const ACTIVE_STATUSES: TicketStatus[] = ["NEW", "OPEN", "PENDING_CUSTOMER"];

interface MyQueuePageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
  }>;
}

async function getMyTickets(
  db: ReturnType<typeof getDb>,
  userId: string,
  filters: {
    status?: string;
    priority?: string;
    search?: string;
    page: number;
    limit: number;
  }
) {
  const conditions = [];

  // Must be assigned to current user
  conditions.push(eq(tickets.assignedToId, userId));

  // Status filter - if specified, use it; otherwise filter to active statuses only
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(tickets.status, filters.status as TicketStatus));
  } else {
    // Default to active statuses only
    conditions.push(inArray(tickets.status, ACTIVE_STATUSES));
  }

  // Priority filter
  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(tickets.priority, filters.priority as TicketPriority));
  }

  // Search filter
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(like(tickets.subject, searchTerm), like(tickets.ticketNumber, searchTerm))
    );
  }

  const whereClause = and(...conditions);
  const offset = (filters.page - 1) * filters.limit;

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

  return {
    tickets: ticketList,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

async function MyQueueContent({
  searchParams,
}: {
  searchParams: {
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
  };
}) {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  if (!hasAnyRole(session.roles, ALLOWED_ROLES)) {
    redirect("/dashboard?error=unauthorized");
  }

  const { env } = await getCloudflareContext();
  const db = getDb((env as CloudflareEnv).DB);

  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;

  const ticketData = await getMyTickets(db, session.user.id, {
    status: searchParams.status,
    priority: searchParams.priority,
    search: searchParams.search,
    page,
    limit,
  });

  // Check if user can share views (SUPERVISOR+)
  const canShareViews = hasAnyRole(session.roles, ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Queue</h1>
        <p className="text-muted-foreground">
          Tickets assigned to you that require your attention
        </p>
      </div>

      <div className="space-y-4">
        <TicketFilters
          defaultStatus={searchParams.status || "all"}
          defaultPriority={searchParams.priority || "all"}
          defaultSearch={searchParams.search || ""}
          canShareViews={canShareViews}
        />

        <TicketTable
          tickets={ticketData.tickets}
          pagination={ticketData.pagination}
        />
      </div>
    </div>
  );
}

function MyQueueSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Queue</h1>
        <p className="text-muted-foreground">
          Tickets assigned to you that require your attention
        </p>
      </div>

      <div className="space-y-4">
        <TicketFilters />
        <TicketTableSkeleton />
      </div>
    </div>
  );
}

export default async function MyQueuePage({ searchParams }: MyQueuePageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<MyQueueSkeleton />}>
      <MyQueueContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

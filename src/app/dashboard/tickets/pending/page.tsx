/**
 * Pending Tickets Page
 *
 * Displays all tickets with "PENDING_CUSTOMER" status.
 * Accessible to all authenticated roles.
 * AGENT users only see their assigned tickets.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers } from "@/db";
import { getSessionWithRole, canViewAllTickets } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, desc, and, like, or, count } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketPriority, UserRole } from "@/db/schema";
import {
  TicketFilters,
  TicketTable,
  TicketTableSkeleton,
} from "@/components/admin";

export const runtime = "edge";

// All authenticated roles can access this page
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// Fixed status for this page
const PAGE_STATUS = "PENDING_CUSTOMER" as const;

interface PendingTicketsPageProps {
  searchParams: Promise<{
    priority?: string;
    search?: string;
    page?: string;
  }>;
}

async function getPendingTickets(
  db: ReturnType<typeof getDb>,
  userId: string,
  canViewAll: boolean,
  filters: {
    priority?: string;
    search?: string;
    page: number;
    limit: number;
  }
) {
  const conditions = [];

  // Fixed status filter for this page
  conditions.push(eq(tickets.status, PAGE_STATUS));

  // Role-based filtering: AGENT can only see assigned tickets
  if (!canViewAll) {
    conditions.push(eq(tickets.assignedToId, userId));
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

async function PendingTicketsContent({
  searchParams,
}: {
  searchParams: {
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

  const canViewAll = canViewAllTickets(session.roles);
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;

  const ticketData = await getPendingTickets(db, session.user.id, canViewAll, {
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
        <h1 className="text-2xl font-semibold tracking-tight">Pending Tickets</h1>
        <p className="text-muted-foreground">
          Tickets awaiting customer response or action
        </p>
      </div>

      <div className="space-y-4">
        <TicketFilters
          defaultPriority={searchParams.priority || "all"}
          defaultSearch={searchParams.search || ""}
          hideStatusFilter
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

function PendingTicketsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pending Tickets</h1>
        <p className="text-muted-foreground">
          Tickets awaiting customer response or action
        </p>
      </div>

      <div className="space-y-4">
        <TicketFilters hideStatusFilter />
        <TicketTableSkeleton />
      </div>
    </div>
  );
}

export default async function PendingTicketsPage({
  searchParams,
}: PendingTicketsPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<PendingTicketsSkeleton />}>
      <PendingTicketsContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

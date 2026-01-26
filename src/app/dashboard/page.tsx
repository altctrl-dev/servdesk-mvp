/**
 * Dashboard Page
 *
 * Main dashboard view showing ticket statistics, filters, and ticket list.
 * Fetches data server-side for initial render.
 */

import { Suspense } from "react";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers } from "@/db";
import { getSessionWithRole, canViewAllTickets } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, desc, and, like, or, count } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketStatus, TicketPriority } from "@/db/schema";
import {
  TicketStats,
  TicketStatsSkeleton,
  TicketFilters,
  TicketTable,
  TicketTableSkeleton,
} from "@/components/admin";

export const runtime = 'edge';

interface DashboardPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
  }>;
}

async function getTicketStats(
  db: ReturnType<typeof getDb>,
  userId: string,
  canViewAll: boolean
) {
  // Build base condition for role-based filtering
  const baseCondition = canViewAll
    ? undefined
    : eq(tickets.assignedToId, userId);

  // Get counts for each status
  const [totalResult] = await db
    .select({ count: count() })
    .from(tickets)
    .where(baseCondition);

  const [openResult] = await db
    .select({ count: count() })
    .from(tickets)
    .where(
      baseCondition
        ? and(baseCondition, or(eq(tickets.status, "NEW"), eq(tickets.status, "OPEN")))
        : or(eq(tickets.status, "NEW"), eq(tickets.status, "OPEN"))
    );

  const [pendingResult] = await db
    .select({ count: count() })
    .from(tickets)
    .where(
      baseCondition
        ? and(baseCondition, eq(tickets.status, "PENDING_CUSTOMER"))
        : eq(tickets.status, "PENDING_CUSTOMER")
    );

  const [resolvedResult] = await db
    .select({ count: count() })
    .from(tickets)
    .where(
      baseCondition
        ? and(baseCondition, eq(tickets.status, "RESOLVED"))
        : eq(tickets.status, "RESOLVED")
    );

  return {
    total: totalResult?.count || 0,
    open: openResult?.count || 0,
    pending: pendingResult?.count || 0,
    resolved: resolvedResult?.count || 0,
  };
}

async function getTickets(
  db: ReturnType<typeof getDb>,
  userId: string,
  canViewAll: boolean,
  filters: {
    status?: string;
    priority?: string;
    search?: string;
    page: number;
    limit: number;
  }
) {
  const conditions = [];

  // Role-based filtering
  if (!canViewAll) {
    conditions.push(eq(tickets.assignedToId, userId));
  }

  // Status filter
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(tickets.status, filters.status as TicketStatus));
  }

  // Priority filter
  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(tickets.priority, filters.priority as TicketPriority));
  }

  // Search filter
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

async function DashboardContent({
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
  if (!session) return null;

  const { env } = await getCloudflareContext();
  const db = getDb((env as CloudflareEnv).DB);

  const canViewAll = canViewAllTickets(session.roles);
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;

  const [stats, ticketData] = await Promise.all([
    getTicketStats(db, session.user.id, canViewAll),
    getTickets(db, session.user.id, canViewAll, {
      status: searchParams.status,
      priority: searchParams.priority,
      search: searchParams.search,
      page,
      limit,
    }),
  ]);

  // Check if user can share views (SUPERVISOR+)
  const canShareViews = hasAnyRole(session.roles, ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your support tickets
        </p>
      </div>

      <TicketStats stats={stats} />

      <div className="space-y-4">
        <TicketFilters
          defaultStatus={searchParams.status || "all"}
          defaultPriority={searchParams.priority || "all"}
          defaultSearch={searchParams.search || ""}
          hideStatusFilter={true}
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your support tickets
        </p>
      </div>

      <TicketStatsSkeleton />

      <div className="space-y-4">
        <TicketFilters hideStatusFilter={true} />
        <TicketTableSkeleton />
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

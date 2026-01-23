/**
 * Team Queue Page
 *
 * Displays all active tickets for the team.
 * Team-based filtering requires backend work - for now shows all active tickets.
 * Accessible to supervisors and above.
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const runtime = "edge";

// Supervisors and above can access this page
const ALLOWED_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// Active ticket statuses for inbox queues
const ACTIVE_STATUSES: TicketStatus[] = ["NEW", "OPEN", "PENDING_CUSTOMER"];

interface TeamQueuePageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
  }>;
}

async function getTeamTickets(
  db: ReturnType<typeof getDb>,
  filters: {
    status?: string;
    priority?: string;
    search?: string;
    page: number;
    limit: number;
  }
) {
  const conditions = [];

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

async function TeamQueueContent({
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

  const ticketData = await getTeamTickets(db, {
    status: searchParams.status,
    priority: searchParams.priority,
    search: searchParams.search,
    page,
    limit,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Queue</h1>
        <p className="text-muted-foreground">
          View and manage tickets assigned to your team members
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Team-based filtering is coming soon. Currently showing all active tickets.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <TicketFilters
          defaultStatus={searchParams.status || "all"}
          defaultPriority={searchParams.priority || "all"}
          defaultSearch={searchParams.search || ""}
          canShareViews={true}
        />

        <TicketTable
          tickets={ticketData.tickets}
          pagination={ticketData.pagination}
        />
      </div>
    </div>
  );
}

function TeamQueueSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Queue</h1>
        <p className="text-muted-foreground">
          View and manage tickets assigned to your team members
        </p>
      </div>

      <div className="space-y-4">
        <TicketFilters />
        <TicketTableSkeleton />
      </div>
    </div>
  );
}

export default async function TeamQueuePage({ searchParams }: TeamQueuePageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<TeamQueueSkeleton />}>
      <TeamQueueContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

/**
 * Trash Page
 *
 * Displays deleted tickets that can be restored or permanently removed.
 * Currently shows CLOSED tickets as a placeholder since there's no soft delete yet.
 * Accessible to supervisors and above only.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, tickets, customers } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq, desc, and, like, or, count } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
import type { TicketPriority, UserRole } from "@/db/schema";
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

// Using CLOSED status as placeholder until soft delete is implemented
const PAGE_STATUS = "CLOSED" as const;

interface TrashPageProps {
  searchParams: Promise<{
    priority?: string;
    search?: string;
    page?: string;
  }>;
}

async function getTrashTickets(
  db: ReturnType<typeof getDb>,
  filters: {
    priority?: string;
    search?: string;
    page: number;
    limit: number;
  }
) {
  const conditions = [];

  // Using CLOSED status as placeholder for "deleted" tickets
  // TODO: Replace with soft delete query when implemented (e.g., deletedAt IS NOT NULL)
  conditions.push(eq(tickets.status, PAGE_STATUS));

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

async function TrashContent({
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

  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;

  const ticketData = await getTrashTickets(db, {
    priority: searchParams.priority,
    search: searchParams.search,
    page,
    limit,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="text-muted-foreground">
          Deleted tickets that can be restored or permanently removed
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Soft delete is not yet implemented. Currently showing closed tickets as a placeholder.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <TicketFilters
          defaultPriority={searchParams.priority || "all"}
          defaultSearch={searchParams.search || ""}
          hideStatusFilter
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

function TrashSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="text-muted-foreground">
          Deleted tickets that can be restored or permanently removed
        </p>
      </div>

      <div className="space-y-4">
        <TicketFilters hideStatusFilter />
        <TicketTableSkeleton />
      </div>
    </div>
  );
}

export default async function TrashPage({ searchParams }: TrashPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<TrashSkeleton />}>
      <TrashContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

/**
 * View Tickets Page
 *
 * Displays tickets filtered by a saved view.
 * Accessible to view owner or any user if the view is shared.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { ViewTicketsClient } from "@/components/admin/view-tickets-client";
import type { UserRole } from "@/db/schema";

export const runtime = "edge";

// All authenticated roles can access views
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

interface ViewTicketsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewTicketsPage({ params }: ViewTicketsPageProps) {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  // Check role-based access
  if (!hasAnyRole(session.roles, ALLOWED_ROLES)) {
    redirect("/dashboard?error=unauthorized");
  }

  const { id } = await params;

  return <ViewTicketsClient viewId={id} userId={session.user.id} />;
}

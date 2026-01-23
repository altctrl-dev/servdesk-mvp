/**
 * Reports Overview Page
 *
 * Dashboard overview with quick stats and links to detailed reports.
 * Accessible to supervisors and above.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";
import { ReportsOverviewClient } from "./reports-overview-client";

export const runtime = 'edge';

// Supervisors and above can access this page
const ALLOWED_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function ReportsOverviewPage() {
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

  return <ReportsOverviewClient />;
}

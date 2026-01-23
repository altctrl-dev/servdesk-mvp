/**
 * Data Export Page
 *
 * Export report data as CSV files.
 * Accessible to ADMIN and SUPER_ADMIN only.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";
import { ExportReportClient } from "./export-report-client";

export const runtime = 'edge';

// Only ADMIN and SUPER_ADMIN can access this page
const ALLOWED_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function ExportReportsPage() {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  // Check role-based access - ADMIN+ only
  if (!hasAnyRole(session.roles, ALLOWED_ROLES)) {
    redirect("/dashboard/reports?error=unauthorized");
  }

  return <ExportReportClient />;
}

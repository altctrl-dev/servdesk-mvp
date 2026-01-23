/**
 * Shared Views Page
 *
 * Displays views shared with the team or organization.
 * Accessible to all authenticated users - shared views are read-only.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { SharedViewsList } from "@/components/admin/shared-views-list";
import type { UserRole } from "@/db/schema";

export const runtime = 'edge';

// All authenticated roles can view shared views
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function SharedViewsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shared Views</h1>
        <p className="text-muted-foreground">
          Views shared with your team and organization
        </p>
      </div>

      <SharedViewsList userId={session.user.id} />
    </div>
  );
}

/**
 * My Views Page
 *
 * Displays custom saved views created by the current user.
 * Accessible to all authenticated roles.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { MyViewsList } from "@/components/admin/my-views-list";
import type { UserRole } from "@/db/schema";

export const runtime = 'edge';

// All authenticated roles can access this page
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function MyViewsPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">My Views</h1>
        <p className="text-muted-foreground">
          Your saved custom ticket views and filters
        </p>
      </div>

      <MyViewsList userId={session.user.id} />
    </div>
  );
}

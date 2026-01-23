/**
 * Create View Page
 *
 * Form to create a new custom ticket view.
 * Accessible to all authenticated users.
 * Only SUPERVISOR+ can create shared views.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { CreateViewForm } from "@/components/admin/create-view-form";
import type { UserRole } from "@/db/schema";

export const runtime = 'edge';

// All authenticated roles can create views
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// Roles that can share views with the team
const CAN_SHARE_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function CreateViewPage() {
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

  // Determine if user can share views
  const canShare = hasAnyRole(session.roles, CAN_SHARE_ROLES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create View</h1>
        <p className="text-muted-foreground">
          Create a new custom view with specific filters and sorting
        </p>
      </div>

      <div className="max-w-2xl">
        <CreateViewForm canShare={canShare} />
      </div>
    </div>
  );
}

/**
 * Admin User Management Page
 *
 * Administrative page for managing user accounts.
 * Accessible to ADMIN and SUPER_ADMIN roles.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { UserManagement } from "@/app/dashboard/users/user-management";
import type { UserRole } from "@/db/schema";

export const runtime = 'edge';

// Admins and above can access this page
const ALLOWED_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function AdminUsersPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, invitations, and access permissions
        </p>
      </div>

      <UserManagement currentUserId={session.user.id} />
    </div>
  );
}

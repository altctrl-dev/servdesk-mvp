/**
 * User Management Page
 *
 * Admin page for viewing/managing users.
 * - SUPER_ADMIN: Full access (invite, edit roles, deactivate)
 * - ADMIN: Read-only access (view users and their roles)
 */

import { redirect } from "next/navigation";
import { requireRole, hasRole } from "@/lib/rbac";
import { UserManagement } from "./user-management";

export default async function UsersPage() {
  // Allow SUPER_ADMIN and ADMIN to access
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  } catch {
    // Not authorized - redirect to dashboard
    redirect("/");
  }

  // Only SUPER_ADMIN can manage users (invite, edit roles, deactivate)
  const canManage = hasRole(session.roles, "SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          {canManage
            ? "Manage user accounts, roles, and access permissions"
            : "View user accounts and their access levels"}
        </p>
      </div>

      <UserManagement currentUserId={session.user.id} canManage={canManage} />
    </div>
  );
}

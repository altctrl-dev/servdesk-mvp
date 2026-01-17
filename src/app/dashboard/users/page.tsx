/**
 * User Management Page
 *
 * Admin page for managing users (SUPER_ADMIN only).
 * Features:
 * - List all users with pagination
 * - Create new users
 * - Edit user roles
 * - Activate/deactivate users
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { UserManagement } from "./user-management";

export default async function UsersPage() {
  // Require SUPER_ADMIN role
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN"]);
  } catch {
    // Not authorized - redirect to dashboard
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and access permissions
        </p>
      </div>

      <UserManagement currentUserId={session.user.id} />
    </div>
  );
}

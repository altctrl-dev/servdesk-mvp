/**
 * Role Management Page
 *
 * Administrative page for viewing roles and their assigned users.
 * Accessible to SUPER_ADMIN only.
 *
 * Features:
 * - Lists all roles from the database
 * - Shows user count per role
 * - Displays role descriptions
 * - Read-only view (role assignment coming in future)
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { getCloudflareContext } from "@/lib/cf-context";
import type { CloudflareEnv } from "@/env";
import { getDb, roles, userRoles, type UserRole } from "@/db";
import { eq, sql } from "drizzle-orm";
import { Shield, Users, ShieldCheck, ShieldAlert, UserCog } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const runtime = 'edge';

// Only super admins can access this page
const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN"];

/** Role icon mapping based on role name */
function getRoleIcon(roleName: string) {
  switch (roleName) {
    case "SUPER_ADMIN":
      return <ShieldAlert className="h-5 w-5 text-red-500" />;
    case "ADMIN":
      return <ShieldCheck className="h-5 w-5 text-orange-500" />;
    case "SUPERVISOR":
      return <UserCog className="h-5 w-5 text-blue-500" />;
    case "AGENT":
      return <Shield className="h-5 w-5 text-green-500" />;
    default:
      return <Shield className="h-5 w-5 text-muted-foreground" />;
  }
}

/** Role badge variant based on role name */
function getRoleBadgeVariant(roleName: string): "default" | "secondary" | "destructive" | "outline" {
  switch (roleName) {
    case "SUPER_ADMIN":
      return "destructive";
    case "ADMIN":
      return "default";
    case "SUPERVISOR":
      return "secondary";
    default:
      return "outline";
  }
}

/** Default descriptions for roles if not set in database */
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Full system access. Can manage all users, roles, and system settings.",
  ADMIN: "Administrative access. Can manage users and view all tickets.",
  SUPERVISOR: "Team lead access. Can view all tickets and manage team assignments.",
  AGENT: "Standard agent access. Can work on assigned tickets.",
};

export default async function RoleManagementPage() {
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

  // Fetch roles with user counts
  const { env } = await getCloudflareContext();
  const db = getDb((env as CloudflareEnv).DB);

  const rolesWithCounts = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      userCount: sql<number>`count(${userRoles.id})`.as("user_count"),
    })
    .from(roles)
    .leftJoin(userRoles, eq(roles.id, userRoles.roleId))
    .groupBy(roles.id, roles.name, roles.description)
    .orderBy(roles.name);

  // Calculate total users with roles
  const totalUsersWithRoles = rolesWithCounts.reduce(
    (sum, role) => sum + Number(role.userCount),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          View roles and their assigned users. Role assignment available through User Management.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rolesWithCounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsersWithRoles}</div>
            <p className="text-xs text-muted-foreground">
              Users can have multiple roles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <div className="grid gap-4 md:grid-cols-2">
        {rolesWithCounts.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {getRoleIcon(role.name)}
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(role.name)}>
                      {role.name}
                    </Badge>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{role.userCount}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {role.description || DEFAULT_DESCRIPTIONS[role.name] || "No description available."}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {rolesWithCounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Shield className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No roles found in the database.
              <br />
              Run database migrations to initialize default roles.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Future Enhancement Note */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Role assignment and permissions configuration coming soon.
            For now, assign roles through the{" "}
            <a href="/dashboard/admin/users" className="text-primary underline">
              User Management
            </a>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

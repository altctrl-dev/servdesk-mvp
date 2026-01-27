/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * Provides authorization helpers for the ServDesk application:
 * - Session retrieval with role information
 * - Multi-role support (users can have multiple roles)
 * - Role requirement middleware
 * - Permission helper functions
 */

import type { CloudflareEnv } from "@/env";
import { getCloudflareContext } from "@/lib/cf-context";
import { createAuth } from "@/lib/auth";
import { getDb, userProfiles, userRoles, roles, type UserRole, USER_ROLES } from "@/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  hasRole,
  hasAnyRole,
  getHighestRole,
  canAccessRoute,
  ROUTE_ACCESS,
} from "@/lib/permissions";

/** Re-export UserRole type for consumers */
export type { UserRole } from "@/db";
export { USER_ROLES };

/** Re-export permission helpers */
export { hasRole, hasAnyRole, getHighestRole, canAccessRoute, ROUTE_ACCESS };

/** Better Auth user type */
interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  twoFactorEnabled?: boolean | null;
}

/** Better Auth session type */
interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Session with role information (multi-role support) */
export interface SessionWithRole {
  user: AuthUser;
  session: AuthSession;
  /** @deprecated Use `roles` array instead. This returns the highest role for backward compatibility. */
  role: UserRole;
  /** Array of all roles assigned to the user */
  roles: UserRole[];
  isActive: boolean;
}

/**
 * Gets the current session and fetches the user's roles from user_roles table.
 *
 * @returns Session with roles if authenticated, null otherwise
 */
export async function getSessionWithRole(): Promise<SessionWithRole | null> {
  try {
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const auth = createAuth(typedEnv);

    // Get session from Better Auth
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session || !session.user) {
      return null;
    }

    const db = getDb(typedEnv.DB);

    // Fetch profile for isActive status
    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    const userProfile = profile[0];

    // Check if account is locked
    if (userProfile?.lockedUntil && userProfile.lockedUntil > new Date()) {
      return null; // Account is locked
    }

    // Primary: Use userProfiles.role (set via User Management UI)
    // This is the single source of truth for roles
    let finalRoles: UserRole[];
    if (userProfile?.role) {
      finalRoles = [userProfile.role as UserRole];
    } else {
      // Fallback: Check user_roles table (for multi-role support if needed later)
      const userRoleResults = await db
        .select({
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, session.user.id));

      const userRolesList = userRoleResults.map((r) => r.roleName as UserRole);
      finalRoles = userRolesList.length > 0 ? userRolesList : ["AGENT" as UserRole];
    }

    // Get highest role for backward compatibility
    const highestRole = getHighestRole(finalRoles) || "AGENT";

    return {
      user: session.user,
      session: session.session,
      role: highestRole, // Backward compatibility
      roles: finalRoles,
      isActive: userProfile?.isActive ?? true,
    };
  } catch (error) {
    console.error("Error getting session with role:", error);
    return null;
  }
}

/**
 * Requires the user to have one of the specified roles.
 * With multi-role support, user passes if ANY of their roles is in allowedRoles.
 *
 * @param allowedRoles - Array of roles that are permitted
 * @returns Session with roles if authorized
 * @throws Error if not authenticated or not authorized
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<SessionWithRole> {
  const session = await getSessionWithRole();

  if (!session) {
    throw new Error("Unauthorized: Not authenticated");
  }

  if (!session.isActive) {
    throw new Error("Unauthorized: Account is disabled");
  }

  if (!hasAnyRole(session.roles, allowedRoles)) {
    throw new Error(
      `Forbidden: User roles [${session.roles.join(", ")}] not in allowed roles [${allowedRoles.join(", ")}]`
    );
  }

  return session;
}

/**
 * Requires any authenticated session (any role).
 *
 * @returns Session with roles if authenticated
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<SessionWithRole> {
  const session = await getSessionWithRole();

  if (!session) {
    throw new Error("Unauthorized: Not authenticated");
  }

  if (!session.isActive) {
    throw new Error("Unauthorized: Account is disabled");
  }

  return session;
}

// =============================================================================
// Permission Helper Functions (updated for multi-role)
// =============================================================================

/**
 * Checks if the user can view all tickets (not just assigned ones).
 *
 * SUPER_ADMIN, ADMIN, and SUPERVISOR can view all tickets.
 * AGENT can only view tickets assigned to them.
 */
export function canViewAllTickets(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
}

/**
 * Checks if the user can assign tickets to agents.
 *
 * SUPER_ADMIN, ADMIN, and SUPERVISOR can assign tickets.
 */
export function canAssignTickets(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
}

/**
 * Checks if the user can reply to a ticket.
 *
 * All authenticated users with any role can reply.
 */
export function canReplyToTicket(userRoles: UserRole[]): boolean {
  return userRoles.length > 0;
}

/**
 * Checks if the user can manage other users (create, update, delete).
 *
 * SUPER_ADMIN and ADMIN can manage users.
 */
export function canManageUsers(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN"]);
}

/**
 * Checks if the user can manage roles (assign/remove roles).
 *
 * Only SUPER_ADMIN can manage roles.
 */
export function canManageRoles(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, "SUPER_ADMIN");
}

/**
 * Checks if the user can change ticket priority.
 *
 * SUPER_ADMIN, ADMIN, and SUPERVISOR can change priority.
 */
export function canChangePriority(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
}

/**
 * Checks if the user can access admin settings.
 *
 * SUPER_ADMIN and ADMIN can access admin settings.
 */
export function canAccessAdmin(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN"]);
}

/**
 * Checks if the user can access system settings (billing, security).
 *
 * Only SUPER_ADMIN can access system settings.
 */
export function canAccessSystemSettings(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, "SUPER_ADMIN");
}

/**
 * Checks if the user can view audit logs.
 *
 * SUPER_ADMIN and ADMIN can view audit logs.
 */
export function canViewAuditLogs(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN"]);
}

/**
 * Checks if the user can delete tickets (move to trash).
 *
 * SUPER_ADMIN, ADMIN, and SUPERVISOR can delete tickets.
 */
export function canDeleteTickets(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
}

/**
 * Checks if the user can restore tickets from trash.
 *
 * SUPER_ADMIN and ADMIN can restore tickets.
 */
export function canRestoreTickets(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN"]);
}

/**
 * Checks if the user can view reports.
 *
 * SUPER_ADMIN, ADMIN, and SUPERVISOR can view reports.
 */
export function canViewReports(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
}

/**
 * Checks if the user can export data.
 *
 * SUPER_ADMIN and ADMIN can export data.
 */
export function canExportData(userRoles: UserRole[]): boolean {
  return hasAnyRole(userRoles, ["SUPER_ADMIN", "ADMIN"]);
}

// =============================================================================
// Backward Compatibility - Single role parameter versions
// =============================================================================

/** @deprecated Use the array version instead */
export function canViewAllTicketsSingle(role: UserRole): boolean {
  return canViewAllTickets([role]);
}

/** @deprecated Use the array version instead */
export function canAssignTicketsSingle(role: UserRole): boolean {
  return canAssignTickets([role]);
}

/** @deprecated Use the array version instead */
export function canManageUsersSingle(role: UserRole): boolean {
  return canManageUsers([role]);
}

/** @deprecated Use the array version instead */
export function canChangePrioritySingle(role: UserRole): boolean {
  return canChangePriority([role]);
}

/** @deprecated Use canAccessAdmin instead */
export function canAccessSettings(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

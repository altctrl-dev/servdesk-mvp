/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * Provides authorization helpers for the ServDesk application:
 * - Session retrieval with role information
 * - Role requirement middleware
 * - Permission helper functions
 */

import type { CloudflareEnv } from "@/env";
import { getCloudflareContext } from "@/lib/cf-context";
import { createAuth } from "@/lib/auth";
import { getDb, userProfiles, type UserRole, USER_ROLES } from "@/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/** Re-export UserRole type for consumers */
export type { UserRole } from "@/db";
export { USER_ROLES };

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

/** Session with role information */
export interface SessionWithRole {
  user: AuthUser;
  session: AuthSession;
  role: UserRole;
  isActive: boolean;
}

/**
 * Gets the current session and fetches the user's role from userProfiles table.
 *
 * @returns Session with role if authenticated, null otherwise
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

    // Fetch role from userProfiles table
    const db = getDb(typedEnv.DB);
    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    // Default to VIEW_ONLY if no profile exists
    const userProfile = profile[0] || {
      role: "VIEW_ONLY" as UserRole,
      isActive: true,
    };

    // Check if account is locked
    if (userProfile.lockedUntil && userProfile.lockedUntil > new Date()) {
      return null; // Account is locked
    }

    return {
      user: session.user,
      session: session.session,
      role: userProfile.role,
      isActive: userProfile.isActive,
    };
  } catch (error) {
    console.error("Error getting session with role:", error);
    return null;
  }
}

/**
 * Requires the user to have one of the specified roles.
 *
 * @param allowedRoles - Array of roles that are permitted
 * @returns Session with role if authorized
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

  if (!allowedRoles.includes(session.role)) {
    throw new Error(
      `Forbidden: Role '${session.role}' not in allowed roles [${allowedRoles.join(", ")}]`
    );
  }

  return session;
}

/**
 * Requires any authenticated session (any role).
 *
 * @returns Session with role if authenticated
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
// Permission Helper Functions
// =============================================================================

/**
 * Checks if the user can view all tickets (not just assigned ones).
 *
 * SUPER_ADMIN and ADMIN can view all tickets.
 * VIEW_ONLY can only view tickets assigned to them.
 */
export function canViewAllTickets(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Checks if the user can assign tickets to agents.
 *
 * SUPER_ADMIN and ADMIN can assign tickets.
 */
export function canAssignTickets(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Checks if the user can reply to a ticket.
 *
 * All authenticated users can reply to tickets.
 * VIEW_ONLY users should only reply to their assigned tickets (enforced elsewhere).
 */
export function canReplyToTicket(role: UserRole): boolean {
  return USER_ROLES.includes(role);
}

/**
 * Checks if the user can manage other users (create, update, delete).
 *
 * Only SUPER_ADMIN can manage users.
 */
export function canManageUsers(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Checks if the user can change ticket priority.
 *
 * SUPER_ADMIN and ADMIN can change priority.
 */
export function canChangePriority(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Checks if the user can access admin settings.
 *
 * Only SUPER_ADMIN can access settings.
 */
export function canAccessSettings(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Checks if the user can view audit logs.
 *
 * SUPER_ADMIN and ADMIN can view audit logs.
 */
export function canViewAuditLogs(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Checks if the user can delete tickets.
 *
 * Only SUPER_ADMIN can delete tickets.
 */
export function canDeleteTickets(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

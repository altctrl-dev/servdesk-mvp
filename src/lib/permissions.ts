/**
 * Permission Helpers for Multi-Role RBAC
 *
 * Provides utilities for checking user roles and permissions.
 * Supports cumulative permissions when users have multiple roles.
 */

import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { userRoles, roles, type UserRole } from "@/db/schema";

// =============================================================================
// ROLE HIERARCHY & PERMISSIONS
// =============================================================================

/**
 * Role hierarchy from highest to lowest privilege
 */
export const ROLE_HIERARCHY: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPERVISOR",
  "AGENT",
];

/**
 * Role IDs for database queries
 */
export const ROLE_IDS: Record<UserRole, string> = {
  SUPER_ADMIN: "role_super_admin",
  ADMIN: "role_admin",
  SUPERVISOR: "role_supervisor",
  AGENT: "role_agent",
};

/**
 * Permission levels - roles inherit permissions from lower levels
 */
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    "system.full_access",
    "system.security",
    "system.billing",
    "system.audit_logs",
    "users.manage_roles",
    "users.manage",
    "admin.all",
    "reports.all",
    "reports.export",
    "tickets.all",
    "tickets.trash",
    "tickets.assign",
    "tickets.escalate",
    "tickets.handle",
    "kb.manage",
    "kb.publish",
    "kb.read",
    "views.manage",
    "views.create",
    "views.read",
  ],
  ADMIN: [
    "users.manage",
    "admin.queues",
    "admin.slas",
    "admin.automation",
    "admin.macros",
    "admin.templates",
    "admin.tags",
    "admin.categories",
    "admin.integrations",
    "reports.all",
    "reports.export",
    "tickets.all",
    "tickets.trash",
    "tickets.assign",
    "tickets.escalate",
    "tickets.handle",
    "kb.manage",
    "kb.publish",
    "kb.read",
    "views.manage",
    "views.create",
    "views.read",
  ],
  SUPERVISOR: [
    "reports.team",
    "reports.sla",
    "reports.csat",
    "reports.volume",
    "reports.backlog",
    "tickets.all",
    "tickets.trash",
    "tickets.assign",
    "tickets.escalate",
    "tickets.handle",
    "kb.drafts",
    "kb.requests",
    "kb.read",
    "views.shared",
    "views.create",
    "views.read",
  ],
  AGENT: [
    "tickets.own",
    "tickets.queue",
    "tickets.handle",
    "kb.read",
    "views.read",
  ],
} as const;

// =============================================================================
// ROUTE ACCESS CONFIGURATION
// =============================================================================

/**
 * Route access configuration - which roles can access which routes
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  // Inbox routes
  "/dashboard/inbox/my": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/inbox/team": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/inbox/unassigned": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/inbox/escalations": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/inbox/sla-breach": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/inbox/waiting-on-customer": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],

  // Tickets routes
  "/dashboard/tickets/open": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/tickets/pending": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/tickets/on-hold": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/tickets/resolved": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/tickets/closed": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/tickets/trash": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],

  // Views routes
  "/dashboard/views": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/views/shared": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/views/new": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],

  // Knowledge Base routes
  "/dashboard/knowledge-base/articles": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/knowledge-base/drafts": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/knowledge-base/categories": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/knowledge-base/tags": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/knowledge-base/requests": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],

  // Reports routes
  "/dashboard/reports/team": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/reports/sla": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/reports/csat": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/reports/volume": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/reports/backlog": ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/reports/export": ["ADMIN", "SUPER_ADMIN"],

  // Admin routes
  "/dashboard/admin/queues": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/routing": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/slas": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/automation": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/macros": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/templates": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/tags": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/categories": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/users": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/admin/roles": ["SUPER_ADMIN"],
  "/dashboard/admin/integrations": ["ADMIN", "SUPER_ADMIN"],

  // Settings routes
  "/dashboard/settings/profile": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/settings/notifications": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/settings/preferences": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/settings/shortcuts": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/settings/security": ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  "/dashboard/settings/api-tokens": ["ADMIN", "SUPER_ADMIN"],
};

// =============================================================================
// ROLE CHECK FUNCTIONS
// =============================================================================

/**
 * Get all roles for a user from the database
 */
export async function getUserRoles(
  db: DrizzleD1Database,
  userId: string
): Promise<UserRole[]> {
  const results = await db
    .select({
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return results.map((r) => r.roleName as UserRole);
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: UserRole[], role: UserRole): boolean {
  return userRoles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.every((role) => userRoles.includes(role));
}

/**
 * Get the highest role from a list of roles (based on hierarchy)
 */
export function getHighestRole(userRoles: UserRole[]): UserRole | null {
  for (const role of ROLE_HIERARCHY) {
    if (userRoles.includes(role)) {
      return role;
    }
  }
  return null;
}

/**
 * Check if user has permission for a specific permission key
 */
export function hasPermission(
  userRoles: UserRole[],
  permission: string
): boolean {
  for (const role of userRoles) {
    const permissions = ROLE_PERMISSIONS[role] as readonly string[];
    if (permissions && permissions.includes(permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  userRoles: UserRole[],
  route: string
): boolean {
  // Check for exact match
  const allowedRoles = ROUTE_ACCESS[route];
  if (allowedRoles) {
    return hasAnyRole(userRoles, allowedRoles);
  }

  // Check for dynamic routes (e.g., /dashboard/tickets/[id])
  // If no specific rule, check parent route
  const segments = route.split("/");
  while (segments.length > 2) {
    segments.pop();
    const parentRoute = segments.join("/");
    const parentAllowedRoles = ROUTE_ACCESS[parentRoute];
    if (parentAllowedRoles) {
      return hasAnyRole(userRoles, parentAllowedRoles);
    }
  }

  // Default: allow if user has any role
  return userRoles.length > 0;
}

/**
 * Get all accessible routes for a user's roles
 */
export function getAccessibleRoutes(userRoles: UserRole[]): string[] {
  return Object.entries(ROUTE_ACCESS)
    .filter(([, allowedRoles]) => hasAnyRole(userRoles, allowedRoles))
    .map(([route]) => route);
}

// =============================================================================
// ROLE ASSIGNMENT FUNCTIONS
// =============================================================================

/**
 * Assign a role to a user
 */
export async function assignRole(
  db: DrizzleD1Database,
  userId: string,
  role: UserRole,
  assignedById?: string
): Promise<void> {
  const roleId = ROLE_IDS[role];

  await db.insert(userRoles).values({
    userId,
    roleId,
    assignedById,
  }).onConflictDoNothing();
}

/**
 * Remove a role from a user
 */
export async function removeRole(
  db: DrizzleD1Database,
  userId: string,
  role: UserRole
): Promise<void> {
  const roleId = ROLE_IDS[role];

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
}

/**
 * Set user's roles (replaces all existing roles)
 */
export async function setUserRoles(
  db: DrizzleD1Database,
  userId: string,
  newRoles: UserRole[],
  assignedById?: string
): Promise<void> {
  // Delete existing roles
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  // Insert new roles
  if (newRoles.length > 0) {
    await db.insert(userRoles).values(
      newRoles.map((role) => ({
        userId,
        roleId: ROLE_IDS[role],
        assignedById,
      }))
    );
  }
}

/**
 * Audit Log Utilities
 *
 * Provides functions for creating audit trail entries.
 * All significant actions in the system should be logged for compliance and debugging.
 */

import type { Database } from "@/db";
import { auditLogs } from "@/db/schema";

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAuditLogParams {
  /** The ticket ID this audit relates to (optional for non-ticket actions) */
  ticketId?: string;
  /** The user who performed the action */
  userId?: string;
  /** User email for quick lookup */
  userEmail?: string;
  /** The type of entity being audited (e.g., "ticket", "user", "message") */
  entityType: string;
  /** The ID of the entity being audited */
  entityId: string;
  /** The action performed (e.g., "created", "status_changed", "assigned") */
  action: string;
  /** The specific field that changed (optional) */
  field?: string;
  /** The previous value (optional) */
  oldValue?: string;
  /** The new value (optional) */
  newValue?: string;
  /** Additional metadata as an object (will be JSON stringified) */
  metadata?: Record<string, unknown>;
  /** IP address of the request (optional) */
  ipAddress?: string;
}

// =============================================================================
// AUDIT LOG CREATION
// =============================================================================

/**
 * Creates an audit log entry in the database.
 *
 * @param db - Drizzle database instance
 * @param params - Audit log parameters
 * @returns The created audit log entry
 */
export async function createAuditLog(
  db: Database,
  params: CreateAuditLogParams
) {
  const [auditLog] = await db
    .insert(auditLogs)
    .values({
      ticketId: params.ticketId,
      userId: params.userId,
      userEmail: params.userEmail,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      field: params.field,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      ipAddress: params.ipAddress,
    })
    .returning();

  return auditLog;
}

// =============================================================================
// COMMON AUDIT ACTIONS (Helper functions for consistent action naming)
// =============================================================================

/**
 * Logs ticket creation.
 */
export async function logTicketCreated(
  db: Database,
  ticketId: string,
  userId: string | undefined,
  userEmail: string | undefined,
  metadata?: Record<string, unknown>
) {
  return createAuditLog(db, {
    ticketId,
    userId,
    userEmail,
    entityType: "ticket",
    entityId: ticketId,
    action: "created",
    metadata,
  });
}

/**
 * Logs ticket status change.
 */
export async function logTicketStatusChanged(
  db: Database,
  ticketId: string,
  userId: string | undefined,
  userEmail: string | undefined,
  oldStatus: string,
  newStatus: string
) {
  return createAuditLog(db, {
    ticketId,
    userId,
    userEmail,
    entityType: "ticket",
    entityId: ticketId,
    action: "status_changed",
    field: "status",
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

/**
 * Logs ticket assignment.
 * @param oldAssigneeEmail - Email of previous assignee (or null if unassigned)
 * @param newAssigneeEmail - Email of new assignee
 */
export async function logTicketAssigned(
  db: Database,
  ticketId: string,
  userId: string | undefined,
  userEmail: string | undefined,
  oldAssigneeEmail: string | null,
  newAssigneeEmail: string
) {
  return createAuditLog(db, {
    ticketId,
    userId,
    userEmail,
    entityType: "ticket",
    entityId: ticketId,
    action: "assigned",
    field: "assignedTo",
    oldValue: oldAssigneeEmail || undefined,
    newValue: newAssigneeEmail,
  });
}

/**
 * Logs message added to ticket.
 */
export async function logMessageAdded(
  db: Database,
  ticketId: string,
  messageId: string,
  userId: string | undefined,
  userEmail: string | undefined,
  messageType: string
) {
  return createAuditLog(db, {
    ticketId,
    userId,
    userEmail,
    entityType: "message",
    entityId: messageId,
    action: "created",
    metadata: { messageType },
  });
}

/**
 * Generic audit log helper for any entity type.
 * Accepts entity params and user context separately.
 */
export async function logAudit(
  db: Database,
  params: {
    entityType: string;
    entityId: string;
    action: string;
    ticketId?: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: string;
  },
  context: {
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
  }
) {
  return createAuditLog(db, {
    ticketId: params.ticketId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    field: params.field,
    oldValue: params.oldValue,
    newValue: params.newValue,
    metadata: params.metadata ? JSON.parse(params.metadata) : undefined,
    userId: context.userId,
    userEmail: context.userEmail,
    ipAddress: context.ipAddress,
  });
}

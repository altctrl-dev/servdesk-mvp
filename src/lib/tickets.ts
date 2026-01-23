/**
 * Ticket Utility Functions
 *
 * Provides helper functions for ticket operations:
 * - Ticket number generation
 * - Tracking token generation
 * - Status transition validation
 */

import { createId } from "@paralleldrive/cuid2";
import type { TicketStatus } from "@/db/schema";

// =============================================================================
// TICKET NUMBER GENERATION
// =============================================================================

/**
 * Generates a unique ticket number in SERVSYS-XXXXX format.
 * Uses 5 random alphanumeric characters for uniqueness.
 *
 * @returns Ticket number string (e.g., "SERVSYS-A7K2M")
 */
export function generateTicketNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SERVSYS-${suffix}`;
}

// =============================================================================
// TRACKING TOKEN GENERATION
// =============================================================================

/**
 * Generates a secure tracking token for customer ticket access.
 * Customers can use this token to view their ticket without authentication.
 *
 * @returns Secure CUID token
 */
export function generateTrackingToken(): string {
  return createId();
}

// =============================================================================
// STATUS TRANSITION VALIDATION
// =============================================================================

/**
 * Valid status transitions for tickets.
 * Enforces the ticket lifecycle workflow.
 */
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "PENDING_CUSTOMER", "ON_HOLD"],
  OPEN: ["PENDING_CUSTOMER", "ON_HOLD", "RESOLVED", "CLOSED"],
  PENDING_CUSTOMER: ["OPEN", "ON_HOLD", "RESOLVED", "CLOSED"],
  ON_HOLD: ["OPEN", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "OPEN"], // OPEN for reopen
  CLOSED: ["OPEN"], // OPEN for reopen
};

/**
 * Validates whether a status transition is allowed.
 *
 * Workflow rules:
 * - NEW -> OPEN, PENDING_CUSTOMER
 * - OPEN -> PENDING_CUSTOMER, RESOLVED, CLOSED
 * - PENDING_CUSTOMER -> OPEN, RESOLVED, CLOSED
 * - RESOLVED -> CLOSED, OPEN (reopen)
 * - CLOSED -> OPEN (reopen)
 *
 * @param currentStatus - The ticket's current status
 * @param newStatus - The desired new status
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateStatusTransition(
  currentStatus: TicketStatus,
  newStatus: TicketStatus
): { isValid: boolean; error?: string } {
  // Same status is a no-op, always valid
  if (currentStatus === newStatus) {
    return { isValid: true };
  }

  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions) {
    return {
      isValid: false,
      error: `Unknown current status: ${currentStatus}`,
    };
  }

  if (!allowedTransitions.includes(newStatus)) {
    return {
      isValid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(", ")}`,
    };
  }

  return { isValid: true };
}

/**
 * Returns the list of valid next statuses for a given current status.
 *
 * @param currentStatus - The ticket's current status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: TicketStatus): TicketStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

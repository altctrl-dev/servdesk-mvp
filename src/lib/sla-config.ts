/**
 * SLA Configuration
 *
 * Defines default SLA targets for first response and resolution times
 * based on ticket priority levels.
 */

import type { TicketPriority } from "@/db/schema";

/**
 * SLA default targets in hours
 */
export const SLA_DEFAULTS = {
  /** Target hours for first agent response by priority */
  firstResponseHours: {
    NORMAL: 24,
    HIGH: 8,
    URGENT: 2,
  } as const satisfies Record<TicketPriority, number>,

  /** Target hours for ticket resolution by priority */
  resolutionHours: {
    NORMAL: 72,
    HIGH: 24,
    URGENT: 8,
  } as const satisfies Record<TicketPriority, number>,
} as const;

/**
 * Get first response SLA target in hours for a priority
 */
export function getFirstResponseTarget(priority: TicketPriority): number {
  return SLA_DEFAULTS.firstResponseHours[priority];
}

/**
 * Get resolution SLA target in hours for a priority
 */
export function getResolutionTarget(priority: TicketPriority): number {
  return SLA_DEFAULTS.resolutionHours[priority];
}

/**
 * Check if first response SLA is breached
 */
export function isFirstResponseBreached(
  createdAt: Date,
  firstResponseAt: Date | null,
  priority: TicketPriority
): boolean {
  const targetHours = getFirstResponseTarget(priority);
  const targetMs = targetHours * 60 * 60 * 1000;
  const now = new Date();

  // If already responded, check if it was within SLA
  if (firstResponseAt) {
    return firstResponseAt.getTime() - createdAt.getTime() > targetMs;
  }

  // If not responded, check if target time has passed
  return now.getTime() - createdAt.getTime() > targetMs;
}

/**
 * Check if resolution SLA is breached
 */
export function isResolutionBreached(
  createdAt: Date,
  resolvedAt: Date | null,
  priority: TicketPriority
): boolean {
  const targetHours = getResolutionTarget(priority);
  const targetMs = targetHours * 60 * 60 * 1000;
  const now = new Date();

  // If already resolved, check if it was within SLA
  if (resolvedAt) {
    return resolvedAt.getTime() - createdAt.getTime() > targetMs;
  }

  // If not resolved, check if target time has passed
  return now.getTime() - createdAt.getTime() > targetMs;
}

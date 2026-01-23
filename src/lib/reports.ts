/**
 * Report Utilities
 *
 * Provides helper functions for generating reports:
 * - Date range parsing (7d, 30d, 90d, custom)
 * - Average response/resolution time calculations
 * - Duration formatting
 */


// =============================================================================
// DATE RANGE PARSING
// =============================================================================

/**
 * Supported date range presets
 */
export type DateRangePreset = "7d" | "30d" | "90d";

/**
 * Parsed date range result
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Parse a date range from preset or custom ISO dates.
 *
 * @param range - Preset range (7d, 30d, 90d) or undefined for custom
 * @param from - Custom start date in ISO format (YYYY-MM-DD or full ISO)
 * @param to - Custom end date in ISO format (YYYY-MM-DD or full ISO)
 * @returns Parsed date range with start and end dates
 * @throws Error if range is invalid or custom dates are missing
 */
export function parseDateRange(
  range?: string,
  from?: string,
  to?: string
): DateRange {
  const now = new Date();
  const end = new Date(now);
  // Set end to end of current day
  end.setHours(23, 59, 59, 999);

  // Handle preset ranges
  if (range === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "90d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  // Handle custom range
  if (from && to) {
    const startDate = new Date(from);
    const endDate = new Date(to);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid custom date format. Use ISO format (YYYY-MM-DD)");
    }

    // Set start to beginning of day
    startDate.setHours(0, 0, 0, 0);
    // Set end to end of day
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throw new Error("Start date must be before end date");
    }

    return { start: startDate, end: endDate };
  }

  // Default to 30 days if no valid range specified
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

// =============================================================================
// METRICS CALCULATIONS
// =============================================================================

/**
 * Ticket data required for response time calculation
 */
interface TicketForResponseTime {
  createdAt: Date | null;
  firstResponseAt: Date | null;
}

/**
 * Calculate average first response time in minutes.
 *
 * Only includes tickets that have a firstResponseAt timestamp.
 * Returns 0 if no tickets have a first response.
 *
 * @param tickets - Array of tickets with createdAt and firstResponseAt
 * @returns Average response time in minutes, or 0 if no data
 */
export function calculateAvgResponseTime(
  tickets: TicketForResponseTime[]
): number {
  const ticketsWithResponse = tickets.filter(
    (t) => t.createdAt && t.firstResponseAt
  );

  if (ticketsWithResponse.length === 0) {
    return 0;
  }

  const totalMinutes = ticketsWithResponse.reduce((sum, ticket) => {
    const createdAt = ticket.createdAt!;
    const firstResponseAt = ticket.firstResponseAt!;
    const diffMs = firstResponseAt.getTime() - createdAt.getTime();
    const diffMinutes = Math.max(0, diffMs / (1000 * 60));
    return sum + diffMinutes;
  }, 0);

  return Math.round(totalMinutes / ticketsWithResponse.length);
}

/**
 * Ticket data required for resolution time calculation
 */
interface TicketForResolutionTime {
  createdAt: Date | null;
  resolvedAt: Date | null;
}

/**
 * Calculate average resolution time in minutes.
 *
 * Only includes tickets that have a resolvedAt timestamp.
 * Returns 0 if no tickets have been resolved.
 *
 * @param tickets - Array of tickets with createdAt and resolvedAt
 * @returns Average resolution time in minutes, or 0 if no data
 */
export function calculateAvgResolutionTime(
  tickets: TicketForResolutionTime[]
): number {
  const resolvedTickets = tickets.filter((t) => t.createdAt && t.resolvedAt);

  if (resolvedTickets.length === 0) {
    return 0;
  }

  const totalMinutes = resolvedTickets.reduce((sum, ticket) => {
    const createdAt = ticket.createdAt!;
    const resolvedAt = ticket.resolvedAt!;
    const diffMs = resolvedAt.getTime() - createdAt.getTime();
    const diffMinutes = Math.max(0, diffMs / (1000 * 60));
    return sum + diffMinutes;
  }, 0);

  return Math.round(totalMinutes / resolvedTickets.length);
}

// =============================================================================
// DURATION FORMATTING
// =============================================================================

/**
 * Format a duration in minutes to a human-readable string.
 *
 * Examples:
 * - 45 -> "45m"
 * - 60 -> "1h 0m"
 * - 90 -> "1h 30m"
 * - 1440 -> "24h 0m"
 * - 0 -> "0m"
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) {
    return "0m";
  }

  const roundedMinutes = Math.round(minutes);

  if (roundedMinutes < 60) {
    return `${roundedMinutes}m`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a duration in minutes to a detailed string with days.
 *
 * Examples:
 * - 45 -> "45m"
 * - 1440 -> "1d 0h"
 * - 1500 -> "1d 1h"
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string with days
 */
export function formatDurationWithDays(minutes: number): string {
  if (minutes < 0) {
    return "0m";
  }

  const roundedMinutes = Math.round(minutes);

  if (roundedMinutes < 60) {
    return `${roundedMinutes}m`;
  }

  const hours = Math.floor(roundedMinutes / 60);

  if (hours < 24) {
    const remainingMinutes = roundedMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${remainingHours}h`;
}

// =============================================================================
// STATISTICS HELPERS
// =============================================================================

/**
 * Calculate percentage with optional decimal places
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 1
): number {
  if (total === 0) {
    return 0;
  }
  const percentage = (value / total) * 100;
  const multiplier = Math.pow(10, decimals);
  return Math.round(percentage * multiplier) / multiplier;
}

/**
 * Group tickets by a specific field value
 */
export function groupBy<T, K extends keyof T>(
  items: T[],
  key: K
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();

  for (const item of items) {
    const value = item[key];
    const existing = map.get(value) || [];
    existing.push(item);
    map.set(value, existing);
  }

  return map;
}

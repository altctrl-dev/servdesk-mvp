/**
 * Zod Validation Schemas
 *
 * Provides validation schemas for all ticket-related API operations.
 * Uses Zod for runtime type checking and validation.
 */

import { z } from "zod";
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  USER_ROLES,
} from "@/db/schema";

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/** Pagination parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Search/filter parameters for tickets list */
export const ticketFilterSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TicketFilter = z.infer<typeof ticketFilterSchema>;

// =============================================================================
// TICKET CREATION
// =============================================================================

/** Schema for creating a new ticket (manual creation by admin) - legacy with customerId */
export const createTicketSchema = z.object({
  /** Customer ID - must reference existing customer */
  customerId: z.string().min(1, "Customer ID is required"),
  /** Ticket subject/title */
  subject: z.string().min(1, "Subject is required").max(255, "Subject too long"),
  /** Initial message content */
  content: z.string().min(1, "Content is required"),
  /** Priority level (optional, defaults to NORMAL) */
  priority: z.enum(TICKET_PRIORITIES).optional().default("NORMAL"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** Schema for creating a new ticket with customer email/name (for manual creation via UI) */
export const createTicketWithCustomerSchema = z.object({
  /** Customer email address */
  customerEmail: z.string().email("Please enter a valid email address"),
  /** Customer name */
  customerName: z.string().min(1, "Customer name is required").max(100, "Name too long"),
  /** Ticket subject/title */
  subject: z.string().min(1, "Subject is required").max(255, "Subject too long"),
  /** Initial message content */
  content: z.string().min(1, "Content is required"),
  /** Priority level (optional, defaults to NORMAL) */
  priority: z.enum(TICKET_PRIORITIES).optional().default("NORMAL"),
});

export type CreateTicketWithCustomerInput = z.infer<typeof createTicketWithCustomerSchema>;

// =============================================================================
// TICKET REPLY
// =============================================================================

/** Allowed message types for replies (OUTBOUND and INTERNAL only) */
const REPLY_MESSAGE_TYPES = ["OUTBOUND", "INTERNAL"] as const;

/** Schema for adding a reply to a ticket */
export const ticketReplySchema = z.object({
  /** Reply content */
  content: z.string().min(1, "Content is required"),
  /** Message type - OUTBOUND (visible to customer) or INTERNAL (admin-only notes) */
  type: z.enum(REPLY_MESSAGE_TYPES),
});

export type TicketReplyInput = z.infer<typeof ticketReplySchema>;

// =============================================================================
// TICKET STATUS CHANGE
// =============================================================================

/** Schema for changing ticket status */
export const ticketStatusChangeSchema = z.object({
  /** New status to transition to */
  status: z.enum(TICKET_STATUSES),
});

export type TicketStatusChangeInput = z.infer<typeof ticketStatusChangeSchema>;

// =============================================================================
// TICKET ASSIGNMENT
// =============================================================================

/** Schema for assigning a ticket to a user */
export const ticketAssignSchema = z.object({
  /** User ID to assign the ticket to */
  userId: z.string().min(1, "User ID is required"),
});

export type TicketAssignInput = z.infer<typeof ticketAssignSchema>;

// =============================================================================
// TICKET TRACKING (Public)
// =============================================================================

/** Schema for public ticket tracking by ticket number and email */
export const ticketTrackByEmailSchema = z.object({
  ticketNumber: z.string().regex(/^SERVSYS-[A-Z0-9]{5}$/, "Invalid ticket number format"),
  email: z.string().email("Invalid email format"),
});

/** Schema for public ticket tracking by token */
export const ticketTrackByTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/** Combined schema for ticket tracking - supports either method */
export const ticketTrackSchema = z.union([
  ticketTrackByEmailSchema,
  ticketTrackByTokenSchema,
]);

export type TicketTrackInput = z.infer<typeof ticketTrackSchema>;

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/** Schema for creating a new user */
export const createUserSchema = z.object({
  /** User's email address */
  email: z.string().email("Invalid email format"),
  /** User's display name */
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  /** User's password */
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  /** User role for access control */
  role: z.enum(USER_ROLES).default("AGENT"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Schema for updating a user */
export const updateUserSchema = z.object({
  /** User role for access control */
  role: z.enum(USER_ROLES).optional(),
  /** Whether the user account is active */
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Schema for user list filters */
export const userFilterSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserFilter = z.infer<typeof userFilterSchema>;

// =============================================================================
// USER INVITATION
// =============================================================================

/** Schema for inviting a new user */
export const inviteUserSchema = z.object({
  /** User's email address */
  email: z.string().email("Invalid email format"),
  /** User role for access control */
  role: z.enum(USER_ROLES).default("AGENT"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Safely parses and validates input against a Zod schema.
 * Returns a standardized result object.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success boolean and either data or error
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors into a readable string
  const errors = result.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");

  return { success: false, error: errors };
}

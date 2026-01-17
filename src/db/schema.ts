/**
 * ServDesk MVP Database Schema
 *
 * This schema uses Drizzle ORM with Cloudflare D1 (SQLite).
 * All tables are designed to work with Better Auth for authentication.
 */

import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

// =============================================================================
// ENUMS (as const arrays for type safety)
// =============================================================================

/** User roles for access control */
export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "VIEW_ONLY"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Ticket status lifecycle */
export const TICKET_STATUSES = [
  "NEW",
  "OPEN",
  "PENDING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Ticket priority levels */
export const TICKET_PRIORITIES = ["NORMAL", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Message types for ticket communications */
export const MESSAGE_TYPES = [
  "INBOUND",
  "OUTBOUND",
  "INTERNAL",
  "SYSTEM",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Generate a new CUID for primary keys */
export const generateId = () => createId();

/** Generate a ticket number in SERVSYS-XXXXX format */
export const generateTicketNumber = () => {
  const num = Math.floor(Math.random() * 100000);
  return `SERVSYS-${num.toString().padStart(5, "0")}`;
};

/** Generate a tracking token for customer ticket access */
export const generateTrackingToken = () => createId();

// =============================================================================
// USER PROFILES TABLE
// =============================================================================

/**
 * Extends Better Auth's user table with ServDesk-specific fields.
 * The userId is a foreign key reference to Better Auth's user.id.
 */
export const userProfiles = sqliteTable(
  "user_profiles",
  {
    /** Primary key, references Better Auth user.id */
    userId: text("user_id").primaryKey(),

    /** User role for access control */
    role: text("role", { enum: USER_ROLES }).notNull().default("VIEW_ONLY"),

    /** Whether the user account is active */
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

    /** Failed login attempt counter for security */
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),

    /** Account locked until this timestamp (null = not locked) */
    lockedUntil: integer("locked_until", { mode: "timestamp" }),

    /** Last password change timestamp */
    passwordChangedAt: integer("password_changed_at", { mode: "timestamp" }),

    /** Record creation timestamp */
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),

    /** Record last update timestamp */
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("user_profiles_role_idx").on(table.role)]
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// =============================================================================
// CUSTOMERS TABLE
// =============================================================================

/**
 * Email submitters who create tickets.
 * These are external users who interact via email, not authenticated users.
 */
export const customers = sqliteTable(
  "customers",
  {
    /** Primary key (CUID) */
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),

    /** Customer email address (unique identifier) */
    email: text("email").notNull().unique(),

    /** Customer display name (optional) */
    name: text("name"),

    /** Customer organization/company (optional) */
    organization: text("organization"),

    /** Total number of tickets created by this customer */
    ticketCount: integer("ticket_count").notNull().default(0),

    /** Record creation timestamp */
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),

    /** Record last update timestamp */
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("customers_email_idx").on(table.email)]
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

// =============================================================================
// TICKETS TABLE
// =============================================================================

/**
 * Core ticket entity for the helpdesk system.
 * Each ticket represents a customer support request.
 */
export const tickets = sqliteTable(
  "tickets",
  {
    /** Primary key (CUID) */
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),

    /** Human-readable ticket number (SERVSYS-XXXXX format) */
    ticketNumber: text("ticket_number")
      .notNull()
      .unique()
      .$defaultFn(() => generateTicketNumber()),

    /** Ticket subject/title */
    subject: text("subject").notNull(),

    /** Current ticket status */
    status: text("status", { enum: TICKET_STATUSES }).notNull().default("NEW"),

    /** Ticket priority level */
    priority: text("priority", { enum: TICKET_PRIORITIES })
      .notNull()
      .default("NORMAL"),

    /** Token for customer to track ticket without authentication */
    trackingToken: text("tracking_token")
      .notNull()
      .unique()
      .$defaultFn(() => generateTrackingToken()),

    /** Foreign key to customers table */
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),

    /** Foreign key to Better Auth user.id (assigned agent) */
    assignedToId: text("assigned_to_id"),

    /** Email thread ID for threading related emails */
    emailThreadId: text("email_thread_id"),

    /** Record creation timestamp */
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),

    /** Record last update timestamp */
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),

    /** Timestamp of first agent response */
    firstResponseAt: integer("first_response_at", { mode: "timestamp" }),

    /** Timestamp when ticket was resolved */
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),

    /** Timestamp when ticket was closed */
    closedAt: integer("closed_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("tickets_ticket_number_idx").on(table.ticketNumber),
    uniqueIndex("tickets_tracking_token_idx").on(table.trackingToken),
    index("tickets_status_idx").on(table.status),
    index("tickets_customer_id_idx").on(table.customerId),
    index("tickets_assigned_to_id_idx").on(table.assignedToId),
    index("tickets_created_at_idx").on(table.createdAt),
    index("tickets_priority_idx").on(table.priority),
  ]
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

// =============================================================================
// MESSAGES TABLE
// =============================================================================

/**
 * Messages within a ticket conversation.
 * Supports inbound (customer), outbound (agent), internal (notes), and system messages.
 */
export const messages = sqliteTable(
  "messages",
  {
    /** Primary key (CUID) */
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),

    /** Foreign key to tickets table (cascade delete) */
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),

    /** Message type */
    type: text("type", { enum: MESSAGE_TYPES }).notNull(),

    /** Plain text content */
    content: text("content").notNull(),

    /** HTML content (optional, for rich formatting) */
    contentHtml: text("content_html"),

    /** Sender email (for INBOUND messages) */
    fromEmail: text("from_email"),

    /** Sender name (for INBOUND messages) */
    fromName: text("from_name"),

    /** Recipient email (for OUTBOUND messages) */
    toEmail: text("to_email"),

    /** Resend message ID (for OUTBOUND messages, for tracking) */
    resendMessageId: text("resend_message_id"),

    /** Foreign key to Better Auth user.id (for agent/system messages) */
    authorId: text("author_id"),

    /** Message creation timestamp */
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("messages_ticket_id_idx").on(table.ticketId),
    index("messages_type_idx").on(table.type),
    index("messages_created_at_idx").on(table.createdAt),
    index("messages_ticket_created_idx").on(table.ticketId, table.createdAt),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// =============================================================================
// AUDIT LOGS TABLE
// =============================================================================

/**
 * Comprehensive audit trail for all system changes.
 * Tracks changes to tickets, users, and other entities.
 */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    /** Primary key (CUID) */
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),

    /** Optional foreign key to tickets table */
    ticketId: text("ticket_id").references(() => tickets.id),

    /** Type of entity being audited */
    entityType: text("entity_type").notNull(),

    /** ID of the entity being audited */
    entityId: text("entity_id").notNull(),

    /** Action performed (created, updated, status_change, assigned, etc.) */
    action: text("action").notNull(),

    /** Field that was changed (optional) */
    field: text("field"),

    /** Previous value (optional) */
    oldValue: text("old_value"),

    /** New value (optional) */
    newValue: text("new_value"),

    /** Additional metadata as JSON string (optional) */
    metadata: text("metadata"),

    /** Foreign key to Better Auth user.id (who made the change) */
    userId: text("user_id"),

    /** Denormalized user email for quick lookup */
    userEmail: text("user_email"),

    /** IP address of the request */
    ipAddress: text("ip_address"),

    /** Audit log creation timestamp */
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("audit_logs_ticket_id_idx").on(table.ticketId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_user_id_idx").on(table.userId),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// =============================================================================
// INBOUND EVENTS TABLE
// =============================================================================

/**
 * Webhook event storage for idempotency and debugging.
 * Stores incoming Resend webhook events to prevent duplicate processing.
 */
export const inboundEvents = sqliteTable(
  "inbound_events",
  {
    /** Primary key (CUID) */
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),

    /** Resend message ID - used as idempotency key */
    resendMessageId: text("resend_message_id").notNull().unique(),

    /** Raw webhook payload as JSON string */
    payload: text("payload").notNull(),

    /** Whether the event has been processed */
    processed: integer("processed", { mode: "boolean" }).notNull().default(false),

    /** Timestamp when event was processed */
    processedAt: integer("processed_at", { mode: "timestamp" }),

    /** Foreign key to tickets table (if event created/updated a ticket) */
    ticketId: text("ticket_id").references(() => tickets.id),

    /** Error message if processing failed */
    error: text("error"),

    /** Event receipt timestamp */
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("inbound_events_resend_message_id_idx").on(table.resendMessageId),
    index("inbound_events_processed_idx").on(table.processed),
    index("inbound_events_created_at_idx").on(table.createdAt),
  ]
);

export type InboundEvent = typeof inboundEvents.$inferSelect;
export type NewInboundEvent = typeof inboundEvents.$inferInsert;

// =============================================================================
// SCHEMA EXPORT (for Drizzle migrations)
// =============================================================================

export const schema = {
  userProfiles,
  customers,
  tickets,
  messages,
  auditLogs,
  inboundEvents,
};

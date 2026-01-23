/**
 * Unit Tests for Zod Validation Schemas
 *
 * Tests all validation schemas used for API input validation:
 * - Pagination
 * - Ticket filters
 * - Ticket creation
 * - Ticket replies
 * - Ticket tracking
 * - User management
 */

import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  ticketFilterSchema,
  createTicketSchema,
  ticketReplySchema,
  ticketStatusChangeSchema,
  ticketAssignSchema,
  ticketTrackByEmailSchema,
  ticketTrackByTokenSchema,
  createUserSchema,
  updateUserSchema,
  userFilterSchema,
  safeValidate,
} from "../validations";

// =============================================================================
// PAGINATION SCHEMA TESTS
// =============================================================================

describe("paginationSchema", () => {
  it("should accept valid pagination parameters", () => {
    const result = paginationSchema.safeParse({ page: 1, limit: 20 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should coerce string numbers to integers", () => {
    const result = paginationSchema.safeParse({ page: "5", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(50);
    }
  });

  it("should use defaults when parameters are missing", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should reject page less than 1", () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject limit greater than 100", () => {
    const result = paginationSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("should reject negative limit", () => {
    const result = paginationSchema.safeParse({ limit: -5 });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TICKET FILTER SCHEMA TESTS
// =============================================================================

describe("ticketFilterSchema", () => {
  it("should accept valid filter parameters", () => {
    const result = ticketFilterSchema.safeParse({
      status: "OPEN",
      priority: "HIGH",
      assignedTo: "user123",
      search: "test query",
      page: 1,
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty filters with defaults", () => {
    const result = ticketFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.status).toBeUndefined();
    }
  });

  it("should accept all valid status values", () => {
    const statuses = ["NEW", "OPEN", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"];
    for (const status of statuses) {
      const result = ticketFilterSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status values", () => {
    const result = ticketFilterSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("should accept all valid priority values", () => {
    const priorities = ["NORMAL", "HIGH", "URGENT"];
    for (const priority of priorities) {
      const result = ticketFilterSchema.safeParse({ priority });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid priority values", () => {
    const result = ticketFilterSchema.safeParse({ priority: "LOW" });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// CREATE TICKET SCHEMA TESTS
// =============================================================================

describe("createTicketSchema", () => {
  it("should accept valid ticket creation data", () => {
    const result = createTicketSchema.safeParse({
      customerId: "cust123",
      subject: "Help needed",
      content: "I have a problem with my order",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("NORMAL"); // default
    }
  });

  it("should accept custom priority", () => {
    const result = createTicketSchema.safeParse({
      customerId: "cust123",
      subject: "Urgent issue",
      content: "System is down!",
      priority: "URGENT",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("URGENT");
    }
  });

  it("should reject empty customerId", () => {
    const result = createTicketSchema.safeParse({
      customerId: "",
      subject: "Test",
      content: "Test content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Customer ID is required");
    }
  });

  it("should reject empty subject", () => {
    const result = createTicketSchema.safeParse({
      customerId: "cust123",
      subject: "",
      content: "Test content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Subject is required");
    }
  });

  it("should reject subject longer than 255 characters", () => {
    const result = createTicketSchema.safeParse({
      customerId: "cust123",
      subject: "a".repeat(256),
      content: "Test content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Subject too long");
    }
  });

  it("should reject empty content", () => {
    const result = createTicketSchema.safeParse({
      customerId: "cust123",
      subject: "Test",
      content: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Content is required");
    }
  });

  it("should reject invalid priority", () => {
    const result = createTicketSchema.safeParse({
      customerId: "cust123",
      subject: "Test",
      content: "Test content",
      priority: "CRITICAL",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TICKET REPLY SCHEMA TESTS
// =============================================================================

describe("ticketReplySchema", () => {
  it("should accept valid OUTBOUND reply", () => {
    const result = ticketReplySchema.safeParse({
      content: "Thank you for contacting us",
      type: "OUTBOUND",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid INTERNAL reply", () => {
    const result = ticketReplySchema.safeParse({
      content: "Internal note: Customer is VIP",
      type: "INTERNAL",
    });
    expect(result.success).toBe(true);
  });

  it("should reject INBOUND type (customer messages come via webhook)", () => {
    const result = ticketReplySchema.safeParse({
      content: "Test",
      type: "INBOUND",
    });
    expect(result.success).toBe(false);
  });

  it("should reject SYSTEM type", () => {
    const result = ticketReplySchema.safeParse({
      content: "Test",
      type: "SYSTEM",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty content", () => {
    const result = ticketReplySchema.safeParse({
      content: "",
      type: "OUTBOUND",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TICKET STATUS CHANGE SCHEMA TESTS
// =============================================================================

describe("ticketStatusChangeSchema", () => {
  it("should accept all valid status values", () => {
    const statuses = ["NEW", "OPEN", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"];
    for (const status of statuses) {
      const result = ticketStatusChangeSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status", () => {
    const result = ticketStatusChangeSchema.safeParse({ status: "ARCHIVED" });
    expect(result.success).toBe(false);
  });

  it("should reject missing status", () => {
    const result = ticketStatusChangeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TICKET ASSIGN SCHEMA TESTS
// =============================================================================

describe("ticketAssignSchema", () => {
  it("should accept valid userId", () => {
    const result = ticketAssignSchema.safeParse({ userId: "user123" });
    expect(result.success).toBe(true);
  });

  it("should reject empty userId", () => {
    const result = ticketAssignSchema.safeParse({ userId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("User ID is required");
    }
  });

  it("should reject missing userId", () => {
    const result = ticketAssignSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TICKET TRACKING SCHEMA TESTS
// =============================================================================

describe("ticketTrackByEmailSchema", () => {
  it("should accept valid ticket number and email", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "SERVSYS-A1B2C",
      email: "customer@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("should accept ticket numbers with digits only", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "SERVSYS-12345",
      email: "test@test.com",
    });
    expect(result.success).toBe(true);
  });

  it("should accept ticket numbers with mixed alphanumeric", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "SERVSYS-AB123",
      email: "test@test.com",
    });
    expect(result.success).toBe(true);
  });

  it("should reject lowercase ticket numbers", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "SERVSYS-abcde",
      email: "test@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("should reject wrong prefix", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "TICKET-A1B2C",
      email: "test@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("should reject wrong suffix length", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "SERVSYS-ABC",
      email: "test@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email format", () => {
    const result = ticketTrackByEmailSchema.safeParse({
      ticketNumber: "SERVSYS-A1B2C",
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("ticketTrackByTokenSchema", () => {
  it("should accept valid token", () => {
    const result = ticketTrackByTokenSchema.safeParse({
      token: "abc123def456",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty token", () => {
    const result = ticketTrackByTokenSchema.safeParse({
      token: "",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// USER MANAGEMENT SCHEMA TESTS
// =============================================================================

describe("createUserSchema", () => {
  it("should accept valid user data", () => {
    const result = createUserSchema.safeParse({
      email: "admin@example.com",
      name: "Admin User",
      password: "SecurePass123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("AGENT"); // default
    }
  });

  it("should accept custom role", () => {
    const result = createUserSchema.safeParse({
      email: "admin@example.com",
      name: "Super Admin",
      password: "SecurePass123",
      role: "SUPER_ADMIN",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("SUPER_ADMIN");
    }
  });

  it("should accept all valid roles", () => {
    const roles = ["SUPER_ADMIN", "ADMIN", "AGENT"];
    for (const role of roles) {
      const result = createUserSchema.safeParse({
        email: "test@example.com",
        name: "Test User",
        password: "SecurePass123",
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid email", () => {
    const result = createUserSchema.safeParse({
      email: "not-an-email",
      name: "Test User",
      password: "SecurePass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      name: "",
      password: "SecurePass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than 100 characters", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      name: "a".repeat(101),
      password: "SecurePass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject password shorter than 8 characters", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      name: "Test User",
      password: "Short1",
    });
    expect(result.success).toBe(false);
  });

  it("should reject password longer than 100 characters", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      name: "Test User",
      password: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid role", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      name: "Test User",
      password: "SecurePass123",
      role: "MANAGER",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("should accept role update", () => {
    const result = updateUserSchema.safeParse({ role: "ADMIN" });
    expect(result.success).toBe(true);
  });

  it("should accept isActive update", () => {
    const result = updateUserSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("should accept both role and isActive", () => {
    const result = updateUserSchema.safeParse({
      role: "SUPER_ADMIN",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty update (no changes)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject invalid role", () => {
    const result = updateUserSchema.safeParse({ role: "INVALID" });
    expect(result.success).toBe(false);
  });
});

describe("userFilterSchema", () => {
  it("should accept valid filter parameters", () => {
    const result = userFilterSchema.safeParse({
      role: "ADMIN",
      isActive: true,
      search: "john",
      page: 1,
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty filters with defaults", () => {
    const result = userFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should coerce string boolean for isActive", () => {
    const result = userFilterSchema.safeParse({ isActive: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});

// =============================================================================
// SAFE VALIDATE HELPER TESTS
// =============================================================================

describe("safeValidate", () => {
  it("should return success for valid data", () => {
    const result = safeValidate(paginationSchema, { page: 1, limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    }
  });

  it("should return error for invalid data", () => {
    const result = safeValidate(paginationSchema, { page: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("should format multiple errors into a single string", () => {
    const result = safeValidate(createTicketSchema, {
      customerId: "",
      subject: "",
      content: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should contain multiple error messages
      expect(result.error).toContain("Customer ID is required");
      expect(result.error).toContain("Subject is required");
      expect(result.error).toContain("Content is required");
    }
  });

  it("should include field path in error message", () => {
    const result = safeValidate(createUserSchema, {
      email: "invalid",
      name: "Test",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("email:");
      expect(result.error).toContain("password:");
    }
  });
});

/**
 * Unit Tests for Ticket Utility Functions
 *
 * Tests the core ticket operations:
 * - Ticket number generation
 * - Tracking token generation
 * - Status transition validation
 */

import { describe, it, expect } from "vitest";
import {
  generateTicketNumber,
  generateTrackingToken,
  validateStatusTransition,
  getValidNextStatuses,
} from "../tickets";

// =============================================================================
// TICKET NUMBER GENERATION TESTS
// =============================================================================

describe("generateTicketNumber", () => {
  it("should generate a ticket number in SERVSYS-XXXXX format", () => {
    const ticketNumber = generateTicketNumber();
    expect(ticketNumber).toMatch(/^SERVSYS-[A-Z0-9]{5}$/);
  });

  it("should generate ticket numbers with only uppercase letters and digits", () => {
    // Generate multiple to increase confidence
    for (let i = 0; i < 100; i++) {
      const ticketNumber = generateTicketNumber();
      const suffix = ticketNumber.replace("SERVSYS-", "");
      expect(suffix).toMatch(/^[A-Z0-9]+$/);
      expect(suffix.length).toBe(5);
    }
  });

  it("should generate unique ticket numbers", () => {
    const numbers = new Set<string>();
    // Generate 100 numbers - all should be unique (high probability)
    for (let i = 0; i < 100; i++) {
      numbers.add(generateTicketNumber());
    }
    // With 36^5 possibilities (~60M), 100 numbers should all be unique
    expect(numbers.size).toBe(100);
  });

  it("should always start with SERVSYS- prefix", () => {
    for (let i = 0; i < 10; i++) {
      const ticketNumber = generateTicketNumber();
      expect(ticketNumber.startsWith("SERVSYS-")).toBe(true);
    }
  });
});

// =============================================================================
// TRACKING TOKEN GENERATION TESTS
// =============================================================================

describe("generateTrackingToken", () => {
  it("should generate a non-empty string", () => {
    const token = generateTrackingToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should generate a CUID2 format token", () => {
    const token = generateTrackingToken();
    // CUID2 tokens are typically 24-25 characters, lowercase alphanumeric
    expect(token).toMatch(/^[a-z0-9]+$/);
    expect(token.length).toBeGreaterThanOrEqual(20);
  });

  it("should generate unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateTrackingToken());
    }
    expect(tokens.size).toBe(100);
  });
});

// =============================================================================
// STATUS TRANSITION VALIDATION TESTS
// =============================================================================

describe("validateStatusTransition", () => {
  describe("same status transitions (no-op)", () => {
    it("should allow NEW -> NEW", () => {
      const result = validateStatusTransition("NEW", "NEW");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should allow OPEN -> OPEN", () => {
      const result = validateStatusTransition("OPEN", "OPEN");
      expect(result.isValid).toBe(true);
    });

    it("should allow CLOSED -> CLOSED", () => {
      const result = validateStatusTransition("CLOSED", "CLOSED");
      expect(result.isValid).toBe(true);
    });
  });

  describe("valid transitions from NEW", () => {
    it("should allow NEW -> OPEN", () => {
      const result = validateStatusTransition("NEW", "OPEN");
      expect(result.isValid).toBe(true);
    });

    it("should allow NEW -> PENDING_CUSTOMER", () => {
      const result = validateStatusTransition("NEW", "PENDING_CUSTOMER");
      expect(result.isValid).toBe(true);
    });

    it("should NOT allow NEW -> RESOLVED", () => {
      const result = validateStatusTransition("NEW", "RESOLVED");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Cannot transition from NEW to RESOLVED");
    });

    it("should NOT allow NEW -> CLOSED", () => {
      const result = validateStatusTransition("NEW", "CLOSED");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Cannot transition from NEW to CLOSED");
    });
  });

  describe("valid transitions from OPEN", () => {
    it("should allow OPEN -> PENDING_CUSTOMER", () => {
      const result = validateStatusTransition("OPEN", "PENDING_CUSTOMER");
      expect(result.isValid).toBe(true);
    });

    it("should allow OPEN -> RESOLVED", () => {
      const result = validateStatusTransition("OPEN", "RESOLVED");
      expect(result.isValid).toBe(true);
    });

    it("should allow OPEN -> CLOSED", () => {
      const result = validateStatusTransition("OPEN", "CLOSED");
      expect(result.isValid).toBe(true);
    });

    it("should NOT allow OPEN -> NEW", () => {
      const result = validateStatusTransition("OPEN", "NEW");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Cannot transition from OPEN to NEW");
    });
  });

  describe("valid transitions from PENDING_CUSTOMER", () => {
    it("should allow PENDING_CUSTOMER -> OPEN", () => {
      const result = validateStatusTransition("PENDING_CUSTOMER", "OPEN");
      expect(result.isValid).toBe(true);
    });

    it("should allow PENDING_CUSTOMER -> RESOLVED", () => {
      const result = validateStatusTransition("PENDING_CUSTOMER", "RESOLVED");
      expect(result.isValid).toBe(true);
    });

    it("should allow PENDING_CUSTOMER -> CLOSED", () => {
      const result = validateStatusTransition("PENDING_CUSTOMER", "CLOSED");
      expect(result.isValid).toBe(true);
    });

    it("should NOT allow PENDING_CUSTOMER -> NEW", () => {
      const result = validateStatusTransition("PENDING_CUSTOMER", "NEW");
      expect(result.isValid).toBe(false);
    });
  });

  describe("valid transitions from RESOLVED", () => {
    it("should allow RESOLVED -> CLOSED", () => {
      const result = validateStatusTransition("RESOLVED", "CLOSED");
      expect(result.isValid).toBe(true);
    });

    it("should allow RESOLVED -> OPEN (reopen)", () => {
      const result = validateStatusTransition("RESOLVED", "OPEN");
      expect(result.isValid).toBe(true);
    });

    it("should NOT allow RESOLVED -> NEW", () => {
      const result = validateStatusTransition("RESOLVED", "NEW");
      expect(result.isValid).toBe(false);
    });

    it("should NOT allow RESOLVED -> PENDING_CUSTOMER", () => {
      const result = validateStatusTransition("RESOLVED", "PENDING_CUSTOMER");
      expect(result.isValid).toBe(false);
    });
  });

  describe("valid transitions from CLOSED", () => {
    it("should allow CLOSED -> OPEN (reopen)", () => {
      const result = validateStatusTransition("CLOSED", "OPEN");
      expect(result.isValid).toBe(true);
    });

    it("should NOT allow CLOSED -> NEW", () => {
      const result = validateStatusTransition("CLOSED", "NEW");
      expect(result.isValid).toBe(false);
    });

    it("should NOT allow CLOSED -> RESOLVED", () => {
      const result = validateStatusTransition("CLOSED", "RESOLVED");
      expect(result.isValid).toBe(false);
    });

    it("should NOT allow CLOSED -> PENDING_CUSTOMER", () => {
      const result = validateStatusTransition("CLOSED", "PENDING_CUSTOMER");
      expect(result.isValid).toBe(false);
    });
  });

  describe("error messages", () => {
    it("should include allowed transitions in error message", () => {
      const result = validateStatusTransition("NEW", "CLOSED");
      expect(result.error).toContain("Allowed transitions:");
      expect(result.error).toContain("OPEN");
      expect(result.error).toContain("PENDING_CUSTOMER");
    });
  });
});

// =============================================================================
// GET VALID NEXT STATUSES TESTS
// =============================================================================

describe("getValidNextStatuses", () => {
  it("should return valid transitions for NEW status", () => {
    const statuses = getValidNextStatuses("NEW");
    expect(statuses).toContain("OPEN");
    expect(statuses).toContain("PENDING_CUSTOMER");
    expect(statuses).not.toContain("RESOLVED");
    expect(statuses).not.toContain("CLOSED");
    expect(statuses).not.toContain("NEW");
  });

  it("should return valid transitions for OPEN status", () => {
    const statuses = getValidNextStatuses("OPEN");
    expect(statuses).toContain("PENDING_CUSTOMER");
    expect(statuses).toContain("RESOLVED");
    expect(statuses).toContain("CLOSED");
    expect(statuses).not.toContain("NEW");
  });

  it("should return valid transitions for PENDING_CUSTOMER status", () => {
    const statuses = getValidNextStatuses("PENDING_CUSTOMER");
    expect(statuses).toContain("OPEN");
    expect(statuses).toContain("RESOLVED");
    expect(statuses).toContain("CLOSED");
    expect(statuses).not.toContain("NEW");
  });

  it("should return valid transitions for RESOLVED status", () => {
    const statuses = getValidNextStatuses("RESOLVED");
    expect(statuses).toContain("CLOSED");
    expect(statuses).toContain("OPEN");
    expect(statuses).not.toContain("NEW");
    expect(statuses).not.toContain("PENDING_CUSTOMER");
  });

  it("should return valid transitions for CLOSED status", () => {
    const statuses = getValidNextStatuses("CLOSED");
    expect(statuses).toContain("OPEN");
    expect(statuses.length).toBe(1);
  });

  it("should return empty array for unknown status", () => {
    // @ts-expect-error - Testing invalid input
    const statuses = getValidNextStatuses("INVALID");
    expect(statuses).toEqual([]);
  });
});

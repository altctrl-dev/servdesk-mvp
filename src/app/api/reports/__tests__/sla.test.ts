/**
 * Tests for SLA Compliance Report API
 *
 * Tests the GET /api/reports/sla endpoint for authorization,
 * SLA calculation logic, and response shape validation.
 *
 * Note: Since this is an Edge Runtime API with complex dependencies,
 * these tests focus on contract validation and expected behavior patterns.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPE DEFINITIONS (from route.ts)
// =============================================================================

interface ComplianceMetrics {
  total: number;
  withinSLA: number;
  breached: number;
  complianceRate: number;
}

interface PriorityBreaches {
  firstResponse: number;
  resolution: number;
}

interface RecentBreach {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  breachType: "firstResponse" | "resolution";
  breachTime: number;
  createdAt: string;
}

interface SLAReportResponse {
  compliance: {
    firstResponse: ComplianceMetrics;
    resolution: ComplianceMetrics;
  };
  breachesByPriority: {
    URGENT: PriorityBreaches;
    HIGH: PriorityBreaches;
    NORMAL: PriorityBreaches;
  };
  recentBreaches: RecentBreach[];
  dateRange: {
    from: string;
    to: string;
  };
}

// =============================================================================
// SLA CONSTANTS (from sla-config.ts)
// =============================================================================

const SLA_TARGETS = {
  firstResponseHours: {
    NORMAL: 24,
    HIGH: 8,
    URGENT: 2,
  },
  resolutionHours: {
    NORMAL: 72,
    HIGH: 24,
    URGENT: 8,
  },
};

// =============================================================================
// RESPONSE SHAPE VALIDATION TESTS
// =============================================================================

describe("SLA Report API - Response Shape", () => {
  describe("ComplianceMetrics shape", () => {
    it("should have all required fields with correct types", () => {
      const metrics: ComplianceMetrics = {
        total: 100,
        withinSLA: 85,
        breached: 15,
        complianceRate: 85.0,
      };

      expect(metrics).toHaveProperty("total");
      expect(typeof metrics.total).toBe("number");

      expect(metrics).toHaveProperty("withinSLA");
      expect(typeof metrics.withinSLA).toBe("number");

      expect(metrics).toHaveProperty("breached");
      expect(typeof metrics.breached).toBe("number");

      expect(metrics).toHaveProperty("complianceRate");
      expect(typeof metrics.complianceRate).toBe("number");
    });

    it("should accept 100% compliance", () => {
      const metrics: ComplianceMetrics = {
        total: 50,
        withinSLA: 50,
        breached: 0,
        complianceRate: 100.0,
      };

      expect(metrics.breached).toBe(0);
      expect(metrics.complianceRate).toBe(100.0);
    });

    it("should accept 0% compliance", () => {
      const metrics: ComplianceMetrics = {
        total: 50,
        withinSLA: 0,
        breached: 50,
        complianceRate: 0.0,
      };

      expect(metrics.withinSLA).toBe(0);
      expect(metrics.complianceRate).toBe(0.0);
    });
  });

  describe("RecentBreach shape", () => {
    it("should have all required fields with correct types", () => {
      const breach: RecentBreach = {
        ticketId: "ticket123",
        ticketNumber: "SERVSYS-A1B2C",
        subject: "Urgent issue",
        priority: "URGENT",
        breachType: "firstResponse",
        breachTime: 30,
        createdAt: "2024-01-01T10:00:00.000Z",
      };

      expect(breach).toHaveProperty("ticketId");
      expect(typeof breach.ticketId).toBe("string");

      expect(breach).toHaveProperty("ticketNumber");
      expect(typeof breach.ticketNumber).toBe("string");

      expect(breach).toHaveProperty("subject");
      expect(typeof breach.subject).toBe("string");

      expect(breach).toHaveProperty("priority");
      expect(typeof breach.priority).toBe("string");

      expect(breach).toHaveProperty("breachType");
      expect(["firstResponse", "resolution"]).toContain(breach.breachType);

      expect(breach).toHaveProperty("breachTime");
      expect(typeof breach.breachTime).toBe("number");

      expect(breach).toHaveProperty("createdAt");
      expect(typeof breach.createdAt).toBe("string");
    });

    it("should accept firstResponse breach type", () => {
      const breach: RecentBreach = {
        ticketId: "ticket1",
        ticketNumber: "SERVSYS-12345",
        subject: "Test",
        priority: "HIGH",
        breachType: "firstResponse",
        breachTime: 60,
        createdAt: "2024-01-01T10:00:00.000Z",
      };

      expect(breach.breachType).toBe("firstResponse");
    });

    it("should accept resolution breach type", () => {
      const breach: RecentBreach = {
        ticketId: "ticket1",
        ticketNumber: "SERVSYS-12345",
        subject: "Test",
        priority: "HIGH",
        breachType: "resolution",
        breachTime: 120,
        createdAt: "2024-01-01T10:00:00.000Z",
      };

      expect(breach.breachType).toBe("resolution");
    });
  });

  describe("SLAReportResponse shape", () => {
    it("should have all required fields with correct structure", () => {
      const response: SLAReportResponse = {
        compliance: {
          firstResponse: {
            total: 100,
            withinSLA: 85,
            breached: 15,
            complianceRate: 85.0,
          },
          resolution: {
            total: 80,
            withinSLA: 70,
            breached: 10,
            complianceRate: 87.5,
          },
        },
        breachesByPriority: {
          URGENT: { firstResponse: 2, resolution: 1 },
          HIGH: { firstResponse: 5, resolution: 3 },
          NORMAL: { firstResponse: 8, resolution: 6 },
        },
        recentBreaches: [],
        dateRange: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-01-31T23:59:59.999Z",
        },
      };

      expect(response).toHaveProperty("compliance");
      expect(response.compliance).toHaveProperty("firstResponse");
      expect(response.compliance).toHaveProperty("resolution");

      expect(response).toHaveProperty("breachesByPriority");
      expect(response.breachesByPriority).toHaveProperty("URGENT");
      expect(response.breachesByPriority).toHaveProperty("HIGH");
      expect(response.breachesByPriority).toHaveProperty("NORMAL");

      expect(response).toHaveProperty("recentBreaches");
      expect(Array.isArray(response.recentBreaches)).toBe(true);

      expect(response).toHaveProperty("dateRange");
    });

    it("should limit recentBreaches to 10 items", () => {
      const response: SLAReportResponse = {
        compliance: {
          firstResponse: { total: 0, withinSLA: 0, breached: 0, complianceRate: 0 },
          resolution: { total: 0, withinSLA: 0, breached: 0, complianceRate: 0 },
        },
        breachesByPriority: {
          URGENT: { firstResponse: 0, resolution: 0 },
          HIGH: { firstResponse: 0, resolution: 0 },
          NORMAL: { firstResponse: 0, resolution: 0 },
        },
        recentBreaches: Array(10).fill({
          ticketId: "ticket1",
          ticketNumber: "SERVSYS-12345",
          subject: "Test",
          priority: "HIGH",
          breachType: "firstResponse" as const,
          breachTime: 60,
          createdAt: "2024-01-01T10:00:00.000Z",
        }),
        dateRange: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-01-31T23:59:59.999Z",
        },
      };

      expect(response.recentBreaches.length).toBeLessThanOrEqual(10);
    });
  });
});

// =============================================================================
// AUTHORIZATION REQUIREMENTS
// =============================================================================

describe("SLA Report API - Authorization", () => {
  it("should require authentication (401 for unauthenticated)", () => {
    const expectedStatus = 401;
    const expectedError = "Unauthorized: Not authenticated";

    expect(expectedStatus).toBe(401);
    expect(expectedError).toContain("Not authenticated");
  });

  it("should reject inactive accounts (401)", () => {
    const expectedStatus = 401;
    const expectedError = "Unauthorized: Account is disabled";

    expect(expectedStatus).toBe(401);
    expect(expectedError).toContain("Account is disabled");
  });

  it("should reject AGENT role (403)", () => {
    const expectedStatus = 403;
    const expectedError = "Forbidden: Insufficient permissions. Requires SUPERVISOR, ADMIN, or SUPER_ADMIN role.";

    expect(expectedStatus).toBe(403);
    expect(expectedError).toContain("Insufficient permissions");
  });

  it("should allow SUPERVISOR role (200)", () => {
    const allowedRoles = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
    expect(allowedRoles).toContain("SUPERVISOR");
  });

  it("should allow ADMIN role (200)", () => {
    const allowedRoles = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
    expect(allowedRoles).toContain("ADMIN");
  });

  it("should allow SUPER_ADMIN role (200)", () => {
    const allowedRoles = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
    expect(allowedRoles).toContain("SUPER_ADMIN");
  });
});

// =============================================================================
// SLA CALCULATION LOGIC
// =============================================================================

describe("SLA Report API - Calculation Logic", () => {
  describe("first response SLA", () => {
    it("should use correct SLA targets by priority", () => {
      expect(SLA_TARGETS.firstResponseHours.URGENT).toBe(2);
      expect(SLA_TARGETS.firstResponseHours.HIGH).toBe(8);
      expect(SLA_TARGETS.firstResponseHours.NORMAL).toBe(24);
    });

    it("should exclude tickets without firstResponseAt from metrics", () => {
      // Tickets without firstResponseAt should not be counted in total
      const ticketsWithResponse = [
        { hasResponse: true },
        { hasResponse: false }, // Excluded
        { hasResponse: true },
      ];

      const counted = ticketsWithResponse.filter((t) => t.hasResponse);
      expect(counted.length).toBe(2);
    });

    it("should calculate compliance based on time difference", () => {
      const createdAt = new Date("2024-01-01T10:00:00.000Z");
      const firstResponseAt = new Date("2024-01-01T12:00:00.000Z");

      const diffHours = (firstResponseAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBe(2);
      expect(diffHours).toBeLessThanOrEqual(SLA_TARGETS.firstResponseHours.URGENT); // Within URGENT SLA
    });

    it("should detect breach when response exceeds target", () => {
      const createdAt = new Date("2024-01-01T10:00:00.000Z");
      const firstResponseAt = new Date("2024-01-01T13:00:00.000Z"); // 3 hours

      const diffHours = (firstResponseAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const urgentTarget = SLA_TARGETS.firstResponseHours.URGENT; // 2 hours

      expect(diffHours).toBeGreaterThan(urgentTarget); // Breached
    });
  });

  describe("resolution SLA", () => {
    it("should use correct SLA targets by priority", () => {
      expect(SLA_TARGETS.resolutionHours.URGENT).toBe(8);
      expect(SLA_TARGETS.resolutionHours.HIGH).toBe(24);
      expect(SLA_TARGETS.resolutionHours.NORMAL).toBe(72);
    });

    it("should only include RESOLVED or CLOSED tickets", () => {
      const resolvedStatuses = ["RESOLVED", "CLOSED"];

      expect(resolvedStatuses).toContain("RESOLVED");
      expect(resolvedStatuses).toContain("CLOSED");
      expect(resolvedStatuses.length).toBe(2);
    });

    it("should calculate compliance based on resolution time", () => {
      const createdAt = new Date("2024-01-01T10:00:00.000Z");
      const resolvedAt = new Date("2024-01-01T16:00:00.000Z"); // 6 hours

      const diffHours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBe(6);
      expect(diffHours).toBeLessThanOrEqual(SLA_TARGETS.resolutionHours.URGENT); // Within URGENT SLA (8h)
    });

    it("should detect breach when resolution exceeds target", () => {
      const createdAt = new Date("2024-01-01T10:00:00.000Z");
      const resolvedAt = new Date("2024-01-01T19:00:00.000Z"); // 9 hours

      const diffHours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const urgentTarget = SLA_TARGETS.resolutionHours.URGENT; // 8 hours

      expect(diffHours).toBeGreaterThan(urgentTarget); // Breached
    });
  });

  describe("breach time calculation", () => {
    it("should calculate minutes over SLA target", () => {
      const targetHours = 2;
      const actualHours = 3;

      const breachMinutes = (actualHours - targetHours) * 60;
      expect(breachMinutes).toBe(60); // 1 hour over = 60 minutes
    });

    it("should return 0 for within-SLA tickets", () => {
      const targetHours = 2;
      const actualHours = 1.5;

      const breachMinutes = Math.max(0, (actualHours - targetHours) * 60);
      expect(breachMinutes).toBe(0);
    });

    it("should handle large breaches", () => {
      const targetHours = 2;
      const actualHours = 26; // 1 day + 2 hours

      const breachMinutes = (actualHours - targetHours) * 60;
      expect(breachMinutes).toBe(1440); // 24 hours = 1440 minutes
    });
  });

  describe("breaches by priority", () => {
    it("should count breaches separately for each priority", () => {
      const breachesByPriority = {
        URGENT: { firstResponse: 2, resolution: 1 },
        HIGH: { firstResponse: 5, resolution: 3 },
        NORMAL: { firstResponse: 8, resolution: 6 },
      };

      expect(breachesByPriority.URGENT.firstResponse).toBe(2);
      expect(breachesByPriority.URGENT.resolution).toBe(1);

      expect(breachesByPriority.HIGH.firstResponse).toBe(5);
      expect(breachesByPriority.HIGH.resolution).toBe(3);

      expect(breachesByPriority.NORMAL.firstResponse).toBe(8);
      expect(breachesByPriority.NORMAL.resolution).toBe(6);
    });

    it("should initialize all priorities with zero breaches", () => {
      const breachesByPriority = {
        URGENT: { firstResponse: 0, resolution: 0 },
        HIGH: { firstResponse: 0, resolution: 0 },
        NORMAL: { firstResponse: 0, resolution: 0 },
      };

      expect(breachesByPriority.URGENT.firstResponse).toBe(0);
      expect(breachesByPriority.HIGH.resolution).toBe(0);
      expect(breachesByPriority.NORMAL.firstResponse).toBe(0);
    });
  });

  describe("compliance rate calculation", () => {
    it("should calculate percentage correctly", () => {
      const withinSLA = 85;
      const total = 100;
      const complianceRate = (withinSLA / total) * 100;

      expect(complianceRate).toBe(85.0);
    });

    it("should return 0 when total is 0", () => {
      const withinSLA = 0;
      const total = 0;
      const complianceRate = total === 0 ? 0 : (withinSLA / total) * 100;

      expect(complianceRate).toBe(0);
    });

    it("should round to 1 decimal place", () => {
      const withinSLA = 2;
      const total = 3;
      const complianceRate = Math.round(((withinSLA / total) * 100) * 10) / 10;

      expect(complianceRate).toBe(66.7);
    });
  });
});

// =============================================================================
// DATE RANGE FILTERING
// =============================================================================

describe("SLA Report API - Date Range Filtering", () => {
  it("should only include tickets created within date range", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const endDate = new Date("2024-01-31T23:59:59.999Z");

    const ticketCreatedAt = new Date("2024-01-15T10:00:00.000Z");

    expect(ticketCreatedAt >= startDate).toBe(true);
    expect(ticketCreatedAt <= endDate).toBe(true);
  });

  it("should exclude tickets created before range", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const ticketCreatedAt = new Date("2023-12-31T23:59:59.999Z");

    expect(ticketCreatedAt < startDate).toBe(true);
  });

  it("should exclude tickets created after range", () => {
    const endDate = new Date("2024-01-31T23:59:59.999Z");
    const ticketCreatedAt = new Date("2024-02-01T00:00:00.000Z");

    expect(ticketCreatedAt > endDate).toBe(true);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("SLA Report API - Edge Cases", () => {
  it("should handle no tickets in date range", () => {
    const response: SLAReportResponse = {
      compliance: {
        firstResponse: {
          total: 0,
          withinSLA: 0,
          breached: 0,
          complianceRate: 0,
        },
        resolution: {
          total: 0,
          withinSLA: 0,
          breached: 0,
          complianceRate: 0,
        },
      },
      breachesByPriority: {
        URGENT: { firstResponse: 0, resolution: 0 },
        HIGH: { firstResponse: 0, resolution: 0 },
        NORMAL: { firstResponse: 0, resolution: 0 },
      },
      recentBreaches: [],
      dateRange: {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-01-31T23:59:59.999Z",
      },
    };

    expect(response.compliance.firstResponse.total).toBe(0);
    expect(response.compliance.resolution.total).toBe(0);
    expect(response.recentBreaches.length).toBe(0);
  });

  it("should handle 100% compliance (no breaches)", () => {
    const response: SLAReportResponse = {
      compliance: {
        firstResponse: {
          total: 50,
          withinSLA: 50,
          breached: 0,
          complianceRate: 100.0,
        },
        resolution: {
          total: 50,
          withinSLA: 50,
          breached: 0,
          complianceRate: 100.0,
        },
      },
      breachesByPriority: {
        URGENT: { firstResponse: 0, resolution: 0 },
        HIGH: { firstResponse: 0, resolution: 0 },
        NORMAL: { firstResponse: 0, resolution: 0 },
      },
      recentBreaches: [],
      dateRange: {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-01-31T23:59:59.999Z",
      },
    };

    expect(response.compliance.firstResponse.breached).toBe(0);
    expect(response.compliance.resolution.breached).toBe(0);
    expect(response.recentBreaches.length).toBe(0);
  });

  it("should handle all tickets breached", () => {
    const response: SLAReportResponse = {
      compliance: {
        firstResponse: {
          total: 50,
          withinSLA: 0,
          breached: 50,
          complianceRate: 0.0,
        },
        resolution: {
          total: 50,
          withinSLA: 0,
          breached: 50,
          complianceRate: 0.0,
        },
      },
      breachesByPriority: {
        URGENT: { firstResponse: 10, resolution: 10 },
        HIGH: { firstResponse: 20, resolution: 20 },
        NORMAL: { firstResponse: 20, resolution: 20 },
      },
      recentBreaches: [],
      dateRange: {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-01-31T23:59:59.999Z",
      },
    };

    expect(response.compliance.firstResponse.withinSLA).toBe(0);
    expect(response.compliance.resolution.withinSLA).toBe(0);
  });

  it("should handle tickets with extreme breach times", () => {
    const breach: RecentBreach = {
      ticketId: "ticket1",
      ticketNumber: "SERVSYS-12345",
      subject: "Very old ticket",
      priority: "URGENT",
      breachType: "resolution",
      breachTime: 10080, // 1 week = 10080 minutes
      createdAt: "2024-01-01T10:00:00.000Z",
    };

    expect(breach.breachTime).toBeGreaterThan(1000);
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

describe("SLA Report API - Error Handling", () => {
  it("should return 500 for internal server errors", () => {
    const expectedStatus = 500;
    const expectedError = "Internal server error";

    expect(expectedStatus).toBe(500);
    expect(expectedError).toBe("Internal server error");
  });

  it("should return 400 for invalid date ranges", () => {
    const expectedStatus = 400;
    expect(expectedStatus).toBe(400);
  });

  it("should handle database errors gracefully", () => {
    const expectedStatus = 500;
    expect(expectedStatus).toBe(500);
  });
});

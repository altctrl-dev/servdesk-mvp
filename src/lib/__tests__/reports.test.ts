/**
 * Unit Tests for Report Utility Functions
 *
 * Tests core report calculation utilities:
 * - Date range parsing (7d, 30d, 90d, custom)
 * - Average response time calculations
 * - Average resolution time calculations
 * - Duration formatting
 * - Percentage calculations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseDateRange,
  calculateAvgResponseTime,
  calculateAvgResolutionTime,
  formatDuration,
  formatDurationWithDays,
  calculatePercentage,
  groupBy,
} from "../reports";

// =============================================================================
// DATE RANGE PARSING TESTS
// =============================================================================

describe("parseDateRange", () => {
  beforeEach(() => {
    // Mock current time to 2024-01-15 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("preset ranges", () => {
    it("should parse 7d range correctly", () => {
      const result = parseDateRange("7d");

      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);

      // Start should be 7 days ago at 00:00:00 local time
      const expectedStart = new Date(2024, 0, 8, 0, 0, 0, 0);
      expect(result.start.getTime()).toBe(expectedStart.getTime());

      // End should be today at 23:59:59.999 local time
      const expectedEnd = new Date(2024, 0, 15, 23, 59, 59, 999);
      expect(result.end.getTime()).toBe(expectedEnd.getTime());
    });

    it("should parse 30d range correctly", () => {
      const result = parseDateRange("30d");

      // Start should be 30 days ago at 00:00:00 local time
      const expectedStart = new Date(2023, 11, 16, 0, 0, 0, 0); // December = month 11
      expect(result.start.getTime()).toBe(expectedStart.getTime());

      // End should be today at 23:59:59.999 local time
      const expectedEnd = new Date(2024, 0, 15, 23, 59, 59, 999);
      expect(result.end.getTime()).toBe(expectedEnd.getTime());
    });

    it("should parse 90d range correctly", () => {
      const result = parseDateRange("90d");

      // Start should be 90 days ago at 00:00:00 local time
      const expectedStart = new Date(2023, 9, 17, 0, 0, 0, 0); // October = month 9
      expect(result.start.getTime()).toBe(expectedStart.getTime());

      // End should be today at 23:59:59.999 local time
      const expectedEnd = new Date(2024, 0, 15, 23, 59, 59, 999);
      expect(result.end.getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe("custom date ranges", () => {
    it("should parse custom date range with ISO dates", () => {
      const result = parseDateRange(undefined, "2024-01-01", "2024-01-10");

      // Start should be 2024-01-01 at 00:00:00 local time
      expect(result.start.getHours()).toBe(0);
      expect(result.start.getMinutes()).toBe(0);
      expect(result.start.getSeconds()).toBe(0);
      expect(result.start.getDate()).toBe(1);
      expect(result.start.getMonth()).toBe(0);
      expect(result.start.getFullYear()).toBe(2024);

      // End should be 2024-01-10 at 23:59:59.999 local time
      expect(result.end.getHours()).toBe(23);
      expect(result.end.getMinutes()).toBe(59);
      expect(result.end.getSeconds()).toBe(59);
      expect(result.end.getMilliseconds()).toBe(999);
      expect(result.end.getDate()).toBe(10);
    });

    it("should parse custom date range with full ISO timestamps", () => {
      const result = parseDateRange(
        undefined,
        "2024-01-01T10:30:00.000Z",
        "2024-01-10T15:45:00.000Z"
      );

      // Should normalize to beginning and end of day (local time)
      expect(result.start.getHours()).toBe(0);
      expect(result.start.getMinutes()).toBe(0);
      expect(result.start.getSeconds()).toBe(0);

      expect(result.end.getHours()).toBe(23);
      expect(result.end.getMinutes()).toBe(59);
      expect(result.end.getSeconds()).toBe(59);
      expect(result.end.getMilliseconds()).toBe(999);
    });

    it("should handle single-day custom range", () => {
      const result = parseDateRange(undefined, "2024-01-15", "2024-01-15");

      expect(result.start.getDate()).toBe(15);
      expect(result.start.getHours()).toBe(0);
      expect(result.end.getDate()).toBe(15);
      expect(result.end.getHours()).toBe(23);
      expect(result.end.getMinutes()).toBe(59);
    });
  });

  describe("default behavior", () => {
    it("should default to 30d when no range specified", () => {
      const result = parseDateRange();

      // Should be same as 30d preset
      const expectedStart = new Date(2023, 11, 16, 0, 0, 0, 0);
      expect(result.start.getTime()).toBe(expectedStart.getTime());

      const expectedEnd = new Date(2024, 0, 15, 23, 59, 59, 999);
      expect(result.end.getTime()).toBe(expectedEnd.getTime());
    });

    it("should default to 30d when invalid range specified", () => {
      const result = parseDateRange("invalid");

      const expectedStart = new Date(2023, 11, 16, 0, 0, 0, 0);
      expect(result.start.getTime()).toBe(expectedStart.getTime());
    });

    it("should default to 30d when only from is provided", () => {
      const result = parseDateRange(undefined, "2024-01-01");

      const expectedStart = new Date(2023, 11, 16, 0, 0, 0, 0);
      expect(result.start.getTime()).toBe(expectedStart.getTime());
    });

    it("should default to 30d when only to is provided", () => {
      const result = parseDateRange(undefined, undefined, "2024-01-10");

      const expectedStart = new Date(2023, 11, 16, 0, 0, 0, 0);
      expect(result.start.getTime()).toBe(expectedStart.getTime());
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid custom date format", () => {
      expect(() => {
        parseDateRange(undefined, "not-a-date", "2024-01-10");
      }).toThrow("Invalid custom date format. Use ISO format (YYYY-MM-DD)");
    });

    it("should throw error when start date is after end date", () => {
      expect(() => {
        parseDateRange(undefined, "2024-01-10", "2024-01-01");
      }).toThrow("Start date must be before end date");
    });

    it("should throw error for invalid to date", () => {
      expect(() => {
        parseDateRange(undefined, "2024-01-01", "invalid-date");
      }).toThrow("Invalid custom date format. Use ISO format (YYYY-MM-DD)");
    });
  });
});

// =============================================================================
// AVERAGE RESPONSE TIME TESTS
// =============================================================================

describe("calculateAvgResponseTime", () => {
  it("should return 0 for empty array", () => {
    const result = calculateAvgResponseTime([]);
    expect(result).toBe(0);
  });

  it("should calculate average correctly for single ticket", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T11:00:00.000Z"),
      },
    ];

    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(60); // 60 minutes
  });

  it("should calculate average correctly for multiple tickets", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T11:00:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T13:30:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T14:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T14:45:00.000Z"),
      },
    ];

    // Average: (60 + 90 + 45) / 3 = 65 minutes
    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(65);
  });

  it("should exclude tickets without firstResponseAt", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T11:00:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        firstResponseAt: null,
      },
      {
        createdAt: new Date("2024-01-01T14:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T15:00:00.000Z"),
      },
    ];

    // Should only include first and third ticket: (60 + 60) / 2 = 60
    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(60);
  });

  it("should exclude tickets without createdAt", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T11:00:00.000Z"),
      },
      {
        createdAt: null,
        firstResponseAt: new Date("2024-01-01T12:00:00.000Z"),
      },
    ];

    // Should only include first ticket
    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(60);
  });

  it("should return 0 if no tickets have both dates", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: null,
      },
      {
        createdAt: null,
        firstResponseAt: new Date("2024-01-01T12:00:00.000Z"),
      },
    ];

    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(0);
  });

  it("should round to nearest integer", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T10:33:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T12:34:00.000Z"),
      },
    ];

    // Average: (33 + 34) / 2 = 33.5 -> rounds to 34
    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(34);
  });

  it("should handle response times over 24 hours", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-02T14:00:00.000Z"),
      },
    ];

    // 28 hours = 1680 minutes
    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(1680);
  });

  it("should treat negative time differences as 0 (edge case)", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T10:00:00.000Z"), // Response before creation (data error)
      },
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        firstResponseAt: new Date("2024-01-01T11:00:00.000Z"),
      },
    ];

    // First ticket has negative diff, treated as 0. Average: (0 + 60) / 2 = 30
    const result = calculateAvgResponseTime(tickets);
    expect(result).toBe(30);
  });
});

// =============================================================================
// AVERAGE RESOLUTION TIME TESTS
// =============================================================================

describe("calculateAvgResolutionTime", () => {
  it("should return 0 for empty array", () => {
    const result = calculateAvgResolutionTime([]);
    expect(result).toBe(0);
  });

  it("should calculate average correctly for single ticket", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T14:00:00.000Z"),
      },
    ];

    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(240); // 4 hours = 240 minutes
  });

  it("should calculate average correctly for multiple tickets", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T12:00:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T14:00:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T16:00:00.000Z"),
      },
    ];

    // Average: (120 + 240 + 360) / 3 = 240 minutes
    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(240);
  });

  it("should exclude tickets without resolvedAt", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T12:00:00.000Z"),
      },
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: null,
      },
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T14:00:00.000Z"),
      },
    ];

    // Should only include first and third: (120 + 240) / 2 = 180
    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(180);
  });

  it("should exclude tickets without createdAt", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T12:00:00.000Z"),
      },
      {
        createdAt: null,
        resolvedAt: new Date("2024-01-01T14:00:00.000Z"),
      },
    ];

    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(120);
  });

  it("should return 0 if no tickets have both dates", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: null,
      },
      {
        createdAt: null,
        resolvedAt: new Date("2024-01-01T12:00:00.000Z"),
      },
    ];

    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(0);
  });

  it("should handle resolution times over multiple days", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-03T10:00:00.000Z"),
      },
    ];

    // 48 hours = 2880 minutes
    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(2880);
  });

  it("should round to nearest integer", () => {
    const tickets = [
      {
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        resolvedAt: new Date("2024-01-01T10:33:30.000Z"),
      },
    ];

    // 33.5 minutes -> rounds to 34
    const result = calculateAvgResolutionTime(tickets);
    expect(result).toBe(34);
  });
});

// =============================================================================
// DURATION FORMATTING TESTS
// =============================================================================

describe("formatDuration", () => {
  it("should format minutes only when less than 60", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(1)).toBe("1m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("should format hours and minutes when 60 or more minutes", () => {
    expect(formatDuration(60)).toBe("1h 0m");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(120)).toBe("2h 0m");
    expect(formatDuration(125)).toBe("2h 5m");
  });

  it("should handle 0 minutes", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("should handle large values", () => {
    expect(formatDuration(1440)).toBe("24h 0m"); // 1 day
    expect(formatDuration(1500)).toBe("25h 0m"); // 25 hours
    expect(formatDuration(2880)).toBe("48h 0m"); // 2 days
  });

  it("should round fractional minutes", () => {
    expect(formatDuration(45.4)).toBe("45m");
    expect(formatDuration(45.6)).toBe("46m");
    expect(formatDuration(90.3)).toBe("1h 30m");
    expect(formatDuration(90.8)).toBe("1h 31m");
  });

  it("should treat negative values as 0", () => {
    expect(formatDuration(-10)).toBe("0m");
    expect(formatDuration(-100)).toBe("0m");
  });
});

describe("formatDurationWithDays", () => {
  it("should format minutes only when less than 60", () => {
    expect(formatDurationWithDays(0)).toBe("0m");
    expect(formatDurationWithDays(45)).toBe("45m");
    expect(formatDurationWithDays(59)).toBe("59m");
  });

  it("should format hours and minutes when less than 24 hours", () => {
    expect(formatDurationWithDays(60)).toBe("1h 0m");
    expect(formatDurationWithDays(90)).toBe("1h 30m");
    expect(formatDurationWithDays(1439)).toBe("23h 59m");
  });

  it("should format days and hours when 24 hours or more", () => {
    expect(formatDurationWithDays(1440)).toBe("1d 0h"); // 24 hours
    expect(formatDurationWithDays(1500)).toBe("1d 1h"); // 25 hours
    expect(formatDurationWithDays(2880)).toBe("2d 0h"); // 48 hours
    expect(formatDurationWithDays(2940)).toBe("2d 1h"); // 49 hours
  });

  it("should handle large values", () => {
    expect(formatDurationWithDays(10080)).toBe("7d 0h"); // 1 week
    expect(formatDurationWithDays(43200)).toBe("30d 0h"); // 30 days
  });

  it("should treat negative values as 0", () => {
    expect(formatDurationWithDays(-10)).toBe("0m");
    expect(formatDurationWithDays(-1440)).toBe("0m");
  });
});

// =============================================================================
// PERCENTAGE CALCULATION TESTS
// =============================================================================

describe("calculatePercentage", () => {
  it("should calculate percentage correctly", () => {
    expect(calculatePercentage(50, 100)).toBe(50.0);
    expect(calculatePercentage(25, 100)).toBe(25.0);
    expect(calculatePercentage(75, 100)).toBe(75.0);
  });

  it("should return 0 when total is 0", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
    expect(calculatePercentage(10, 0)).toBe(0);
  });

  it("should round to 1 decimal place by default", () => {
    expect(calculatePercentage(1, 3)).toBe(33.3);
    expect(calculatePercentage(2, 3)).toBe(66.7);
    expect(calculatePercentage(1, 7)).toBe(14.3);
  });

  it("should support custom decimal places", () => {
    expect(calculatePercentage(1, 3, 0)).toBe(33);
    expect(calculatePercentage(1, 3, 2)).toBe(33.33);
    expect(calculatePercentage(1, 3, 3)).toBe(33.333);
  });

  it("should handle 0 value", () => {
    expect(calculatePercentage(0, 100)).toBe(0);
  });

  it("should handle 100% correctly", () => {
    expect(calculatePercentage(100, 100)).toBe(100.0);
  });

  it("should handle values greater than 100%", () => {
    expect(calculatePercentage(150, 100)).toBe(150.0);
  });

  it("should handle fractional values", () => {
    expect(calculatePercentage(12.5, 50)).toBe(25.0);
    expect(calculatePercentage(33.33, 100)).toBe(33.3);
  });
});

// =============================================================================
// GROUP BY TESTS
// =============================================================================

describe("groupBy", () => {
  interface TestItem {
    id: string;
    category: string;
    priority: "HIGH" | "NORMAL";
  }

  it("should group items by specified key", () => {
    const items: TestItem[] = [
      { id: "1", category: "bug", priority: "HIGH" },
      { id: "2", category: "feature", priority: "NORMAL" },
      { id: "3", category: "bug", priority: "NORMAL" },
    ];

    const grouped = groupBy(items, "category");

    expect(grouped.size).toBe(2);
    expect(grouped.get("bug")).toHaveLength(2);
    expect(grouped.get("feature")).toHaveLength(1);
  });

  it("should handle empty array", () => {
    const items: TestItem[] = [];
    const grouped = groupBy(items, "category");

    expect(grouped.size).toBe(0);
  });

  it("should handle single item", () => {
    const items: TestItem[] = [
      { id: "1", category: "bug", priority: "HIGH" },
    ];

    const grouped = groupBy(items, "category");

    expect(grouped.size).toBe(1);
    expect(grouped.get("bug")).toHaveLength(1);
  });

  it("should group by different keys", () => {
    const items: TestItem[] = [
      { id: "1", category: "bug", priority: "HIGH" },
      { id: "2", category: "feature", priority: "HIGH" },
      { id: "3", category: "bug", priority: "NORMAL" },
    ];

    const groupedByPriority = groupBy(items, "priority");

    expect(groupedByPriority.size).toBe(2);
    expect(groupedByPriority.get("HIGH")).toHaveLength(2);
    expect(groupedByPriority.get("NORMAL")).toHaveLength(1);
  });

  it("should preserve original items in groups", () => {
    const items: TestItem[] = [
      { id: "1", category: "bug", priority: "HIGH" },
      { id: "2", category: "bug", priority: "NORMAL" },
    ];

    const grouped = groupBy(items, "category");
    const bugGroup = grouped.get("bug")!;

    expect(bugGroup[0]).toBe(items[0]);
    expect(bugGroup[1]).toBe(items[1]);
  });

  it("should handle all items having same value", () => {
    const items: TestItem[] = [
      { id: "1", category: "bug", priority: "HIGH" },
      { id: "2", category: "bug", priority: "HIGH" },
      { id: "3", category: "bug", priority: "HIGH" },
    ];

    const grouped = groupBy(items, "category");

    expect(grouped.size).toBe(1);
    expect(grouped.get("bug")).toHaveLength(3);
  });
});

/**
 * API Integration Tests - Health Endpoint
 *
 * Tests the health check endpoint to verify basic API functionality.
 * This serves as a template for other API route tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../health/route";

// =============================================================================
// TYPES
// =============================================================================

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
}

// =============================================================================
// HEALTH ENDPOINT TESTS
// =============================================================================

describe("GET /api/health", () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  it("should return 200 OK status", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("should return JSON content type", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should return healthy status in response body", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;
    expect(body.status).toBe("healthy");
  });

  it("should include timestamp in ISO format", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;
    expect(body.timestamp).toBeDefined();
    // Check ISO format (e.g., "2024-01-15T10:30:00.000Z")
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should include version number", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;
    expect(body.version).toBe("0.1.0");
  });

  it("should include environment", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;
    expect(body.environment).toBeDefined();
    expect(typeof body.environment).toBe("string");
  });

  it("should return complete health response structure", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    // Verify all expected fields exist
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("environment");

    // Verify no unexpected fields (strict structure)
    const keys = Object.keys(body);
    expect(keys.length).toBe(4);
  });
});

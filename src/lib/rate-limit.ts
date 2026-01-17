/**
 * Rate Limiting Utilities
 *
 * Provides KV-based rate limiting for API endpoints.
 * Uses Cloudflare Workers KV for distributed rate limiting.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the window */
  remaining: number;
  /** Timestamp when the rate limit resets (Unix ms) */
  resetAt: number;
}

interface RateLimitEntry {
  /** Number of requests made in current window */
  count: number;
  /** Window start timestamp (Unix ms) */
  windowStart: number;
}

// =============================================================================
// RATE LIMIT IMPLEMENTATION
// =============================================================================

/**
 * Checks rate limit for a given key using KV storage.
 *
 * Uses a sliding window algorithm:
 * 1. Get current entry from KV (or create new one)
 * 2. If window expired, reset counter
 * 3. Increment counter and check against limit
 * 4. Update KV with new counter
 *
 * @param kv - Cloudflare KV namespace (RATE_LIMIT binding)
 * @param key - Unique identifier for rate limiting (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and remaining requests
 *
 * @example
 * ```ts
 * const result = await checkRateLimit(env.RATE_LIMIT, `ip:${clientIp}`, 10, 60000);
 * if (!result.allowed) {
 *   return new Response("Too many requests", { status: 429 });
 * }
 * ```
 */
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const kvKey = `rate_limit:${key}`;

  try {
    // Get existing rate limit entry
    const existingJson = await kv.get(kvKey);
    let entry: RateLimitEntry;

    if (existingJson) {
      entry = JSON.parse(existingJson) as RateLimitEntry;

      // Check if window has expired
      if (now - entry.windowStart >= windowMs) {
        // Reset for new window
        entry = { count: 0, windowStart: now };
      }
    } else {
      // Create new entry
      entry = { count: 0, windowStart: now };
    }

    // Increment counter
    entry.count += 1;

    // Calculate remaining and reset time
    const remaining = Math.max(0, limit - entry.count);
    const resetAt = entry.windowStart + windowMs;

    // Store updated entry with TTL matching window
    // Add a small buffer (1 second) to ensure entry isn't deleted too early
    const ttlSeconds = Math.ceil(windowMs / 1000) + 1;
    await kv.put(kvKey, JSON.stringify(entry), {
      expirationTtl: ttlSeconds,
    });

    return {
      allowed: entry.count <= limit,
      remaining,
      resetAt,
    };
  } catch (error) {
    // On error, allow the request but log the issue
    // This prevents rate limit failures from blocking legitimate traffic
    console.error("Rate limit check failed:", error);
    return {
      allowed: true,
      remaining: limit,
      resetAt: now + windowMs,
    };
  }
}

/**
 * Creates rate limit headers for HTTP responses.
 *
 * @param result - Rate limit result
 * @param limit - Maximum requests allowed
 * @returns Headers object with standard rate limit headers
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  limit: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

/**
 * Gets the client IP address from the request.
 * Handles Cloudflare's CF-Connecting-IP header.
 *
 * @param request - The incoming request
 * @returns Client IP address or "unknown"
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    request.headers.get("X-Real-IP") ||
    "unknown"
  );
}

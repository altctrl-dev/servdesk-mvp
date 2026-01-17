import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Re-export all schema definitions
export * from "./schema";

/**
 * Creates a Drizzle ORM instance from the D1 database binding.
 *
 * Usage in API routes or server components:
 * ```ts
 * import { getCloudflareContext } from "@/lib/cf-context";
 * import { getDb } from "@/db";
 *
 * const { env } = await getCloudflareContext();
 * const db = getDb(env.DB);
 *
 * // Query with full type safety
 * const tickets = await db.select().from(schema.tickets);
 * ```
 */
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

/**
 * Legacy alias for getDb - use getDb instead.
 * @deprecated Use getDb instead
 */
export const createDb = getDb;

/** Database instance type with schema */
export type Database = ReturnType<typeof getDb>;

import { getRequestContext } from "@cloudflare/next-on-pages";
import type { CloudflareEnv } from "@/env";

/**
 * Gets the Cloudflare context including environment bindings.
 *
 * This provides access to:
 * - env.DB: D1 database binding
 * - env.SESSIONS: KV namespace for session storage
 * - env.ASSETS: Static assets binding
 *
 * Usage:
 * ```ts
 * import { getCloudflareContext } from "@/lib/cf-context";
 *
 * export async function GET() {
 *   const { env } = await getCloudflareContext();
 *   // Use env.DB, env.SESSIONS, etc.
 * }
 * ```
 *
 * Note: This only works in edge runtime routes.
 */
export async function getCloudflareContext() {
  const context = getRequestContext<CloudflareEnv>();
  return context;
}

/**
 * Checks if we're running in a Cloudflare Workers environment.
 */
export function isCloudflareRuntime(): boolean {
  return typeof globalThis !== "undefined" && "caches" in globalThis;
}

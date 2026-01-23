/**
 * Better Auth Server Configuration
 *
 * Provides authentication services using Better Auth with:
 * - Email/password authentication
 * - TOTP-based two-factor authentication
 * - Kysely D1 adapter for Cloudflare D1 database
 * - Session management with configurable expiry
 */

import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { D1Dialect } from "kysely-d1";
import type { CloudflareEnv } from "@/env";

/**
 * Creates a Better Auth instance configured for the given Cloudflare environment.
 *
 * Must be called per-request since D1 bindings are only available at request time
 * in Cloudflare Workers/Pages.
 *
 * @param env - Cloudflare environment bindings
 * @returns Configured Better Auth instance
 */
export function createAuth(env: CloudflareEnv) {
  return betterAuth({
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],

    // Email/password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // MVP: Skip email verification for now
      minPasswordLength: 8,
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24, // 24 hours in seconds
      updateAge: 60 * 60, // Refresh session every 1 hour
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // Cache cookie for 5 minutes
      },
    },

    // Cookie configuration
    advanced: {
      cookiePrefix: "servdesk",
      useSecureCookies: env.ENVIRONMENT === "production",
    },

    // Rate limiting configuration
    rateLimit: {
      enabled: true,
      window: 60, // 1 minute window
      max: 10, // 10 requests per window
    },

    // Plugins
    plugins: [
      twoFactor({
        issuer: "ServDesk",
        totpOptions: {
          digits: 6,
          period: 30,
        },
      }),
    ],

    // User model customization (for linking to userProfiles)
    user: {
      additionalFields: {
        // We store role in userProfiles table, not in the user table
      },
    },
  });
}

/** Type for the auth instance */
export type Auth = ReturnType<typeof createAuth>;

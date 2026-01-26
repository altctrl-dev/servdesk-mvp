/**
 * Better Auth Server Configuration
 *
 * Provides authentication services using Better Auth with:
 * - Microsoft OAuth (Azure AD) authentication
 * - Kysely D1 adapter for Cloudflare D1 database
 * - Session management with configurable expiry
 * - Automatic user profile creation on first sign-in
 */

import { betterAuth } from "better-auth";
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
  const tenantId = env.MICROSOFT_TENANT_ID || "common";

  return betterAuth({
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],

    // Microsoft OAuth only - no email/password
    emailAndPassword: {
      enabled: false,
    },

    // Social providers
    socialProviders: {
      microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        tenantId: tenantId,
        // Request additional scopes for user info
        scope: ["openid", "profile", "email", "User.Read"],
      },
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

    // Account linking - allow linking OAuth to existing accounts with same email
    accountLinking: {
      enabled: true,
      trustedProviders: ["microsoft"],
    },

    // Rate limiting configuration
    rateLimit: {
      enabled: true,
      window: 60, // 1 minute window
      max: 20, // 20 requests per window (increased for OAuth flow)
    },

    // Database hooks for user profile creation
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Create user profile when a new user signs in via Microsoft
            // Check if there's a pending invitation for this email
            try {
              const email = user.email?.toLowerCase();
              if (!email) return;

              // Check for pending invitation
              const invitationResult = await env.DB.prepare(
                `SELECT id, role FROM invitations
                 WHERE email = ?1
                 AND accepted_at IS NULL
                 AND expires_at > ?2
                 LIMIT 1`
              ).bind(email, Date.now() / 1000).first<{ id: string; role: string }>();

              let role = "VIEW_ONLY"; // Default role for uninvited users

              if (invitationResult) {
                // Use the invited role
                role = invitationResult.role;

                // Mark invitation as accepted
                await env.DB.prepare(
                  `UPDATE invitations SET accepted_at = ?1 WHERE id = ?2`
                ).bind(Date.now() / 1000, invitationResult.id).run();
              }

              // Create user profile
              await env.DB.prepare(
                `INSERT INTO user_profiles (user_id, role, is_active, failed_login_attempts, created_at, updated_at)
                 VALUES (?1, ?2, 1, 0, unixepoch(), unixepoch())`
              ).bind(user.id, role).run();

              console.log(`Created user profile for ${email} with role ${role}`);
            } catch (error) {
              console.error("Error creating user profile:", error);
              // Don't throw - let the user sign in, profile can be created manually
            }
          },
        },
      },
    },

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

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

    // Database hooks for invitation-only sign-up
    databaseHooks: {
      user: {
        create: {
          // Before hook: Validate invitation exists before allowing sign-up
          before: async (user) => {
            const email = user.email?.toLowerCase();
            if (!email) {
              return false; // Cancel creation
            }

            // Check for pending invitation
            const invitationResult = await env.DB.prepare(
              `SELECT id, role FROM invitations
               WHERE email = ?1
               AND accepted_at IS NULL
               AND expires_at > ?2
               LIMIT 1`
            ).bind(email, Date.now()).first<{ id: string; role: string }>();

            if (!invitationResult) {
              // No valid invitation - reject sign-up by returning false
              console.log(`Rejected sign-up attempt for ${email} - no valid invitation`);
              return false;
            }

            // Invitation exists, allow creation
            return { data: user };
          },
          // After hook: Create user profile and mark invitation as accepted
          after: async (user) => {
            try {
              const email = user.email?.toLowerCase();
              if (!email) return;

              // Get the invitation (we know it exists from the before hook)
              const invitationResult = await env.DB.prepare(
                `SELECT id, role FROM invitations
                 WHERE email = ?1
                 AND accepted_at IS NULL
                 AND expires_at > ?2
                 LIMIT 1`
              ).bind(email, Date.now()).first<{ id: string; role: string }>();

              if (invitationResult) {
                const normalizedRole =
                  invitationResult.role === "VIEW_ONLY"
                    ? "AGENT"
                    : invitationResult.role;
                const roleIdMap: Record<string, string> = {
                  SUPER_ADMIN: "role_super_admin",
                  ADMIN: "role_admin",
                  SUPERVISOR: "role_supervisor",
                  AGENT: "role_agent",
                };
                const roleId = roleIdMap[normalizedRole] || "role_agent";

                // Mark invitation as accepted
                await env.DB.prepare(
                  `UPDATE invitations SET accepted_at = ?1 WHERE id = ?2`
                ).bind(Date.now(), invitationResult.id).run();

                // Create user profile with the invited role
                await env.DB.prepare(
                  `INSERT INTO user_profiles (user_id, role, is_active, failed_login_attempts, created_at, updated_at)
                   VALUES (?1, ?2, 1, 0, unixepoch(), unixepoch())`
                ).bind(user.id, normalizedRole).run();

                // Create user_roles entry for multi-role RBAC
                await env.DB.prepare(
                  `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_at)
                   VALUES (lower(hex(randomblob(12))), ?1, ?2, unixepoch())`
                ).bind(user.id, roleId).run();

                console.log(`Created user profile for ${email} with role ${normalizedRole}`);
              }
            } catch (error) {
              console.error("Error creating user profile:", error);
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

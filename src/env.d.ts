/**
 * Cloudflare environment bindings type definition.
 *
 * This interface describes all the bindings available in wrangler.toml.
 * Update this when adding new bindings.
 */

// CloudflareEnv type with index signature for getRequestContext compatibility
export type CloudflareEnv = {
  // D1 Database
  DB: D1Database;

  // KV Namespace for sessions
  SESSIONS: KVNamespace;

  // KV Namespace for rate limiting
  RATE_LIMIT: KVNamespace;

  // Static assets
  ASSETS: Fetcher;

  // Environment variables
  ENVIRONMENT: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  // Resend email configuration
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  /** Support email from address, e.g., "ServDesk Support <help@servsys.com>" */
  SUPPORT_EMAIL_FROM: string;
  /** Reply-to email address, e.g., "help@servsys.com" */
  SUPPORT_EMAIL_REPLY_TO: string;
  /** Base URL for tracking links, e.g., "https://servdesk.example.com" */
  BASE_URL: string;

  // Cloudflare Email Worker secret
  INBOUND_API_SECRET: string;

  // OAuth (optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
} & Record<string, unknown>;

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENVIRONMENT?: string;
      BETTER_AUTH_SECRET?: string;
      BETTER_AUTH_URL?: string;
      RESEND_API_KEY?: string;
      RESEND_WEBHOOK_SECRET?: string;
      SUPPORT_EMAIL_FROM?: string;
      SUPPORT_EMAIL_REPLY_TO?: string;
      BASE_URL?: string;
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      CLOUDFLARE_ACCOUNT_ID?: string;
      CLOUDFLARE_D1_DATABASE_ID?: string;
      CLOUDFLARE_API_TOKEN?: string;
      INBOUND_API_SECRET?: string;
    }
  }
}

/**
 * Better Auth Client Configuration
 *
 * Provides client-side authentication utilities:
 * - Microsoft OAuth sign in
 * - Session hooks for React components
 */

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client instance.
 *
 * The baseURL is determined at runtime to support both development
 * and production environments.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

// Export commonly used functions
export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient;

/**
 * Sign in with Microsoft OAuth.
 *
 * @param callbackURL - URL to redirect after successful login
 * @returns Promise that redirects to Microsoft login
 */
export async function signInWithMicrosoft(callbackURL: string = "/dashboard") {
  const result = await signIn.social({
    provider: "microsoft",
    callbackURL,
  });
  return result;
}

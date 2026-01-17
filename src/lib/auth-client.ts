/**
 * Better Auth Client Configuration
 *
 * Provides client-side authentication utilities:
 * - Sign in, sign up, sign out functions
 * - Session hooks for React components
 * - Two-factor authentication helpers
 */

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/**
 * Better Auth client instance with two-factor support.
 *
 * The baseURL is determined at runtime to support both development
 * and production environments.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  plugins: [twoFactorClient()],
});

// Export commonly used functions
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Two-factor authentication helpers
export const twoFactor = authClient.twoFactor;

/**
 * Sign in with email and password.
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with session or error
 */
export async function signInWithEmail(email: string, password: string) {
  const result = await signIn.email({
    email,
    password,
  });
  return result;
}

/**
 * Sign up with email and password.
 *
 * @param email - User's email address
 * @param password - User's password
 * @param name - User's display name
 * @returns Promise with session or error
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
) {
  const result = await signUp.email({
    email,
    password,
    name,
  });
  return result;
}

/**
 * Verify TOTP code for two-factor authentication.
 *
 * @param code - 6-digit TOTP code
 * @returns Promise with verification result
 */
export async function verifyTOTP(code: string) {
  const result = await twoFactor.verifyTotp({
    code,
  });
  return result;
}

/**
 * Enable two-factor authentication for the current user.
 *
 * @param password - User's password for verification
 * @returns Promise with TOTP secret and QR code URL
 */
export async function enableTwoFactor(password: string) {
  const result = await twoFactor.enable({
    password,
  });
  return result;
}

/**
 * Disable two-factor authentication for the current user.
 *
 * @param password - User's password for verification
 * @returns Promise with result
 */
export async function disableTwoFactor(password: string) {
  const result = await twoFactor.disable({
    password,
  });
  return result;
}

/**
 * Get TOTP URI for setting up authenticator app.
 *
 * @param password - User's password for verification
 * @returns Promise with TOTP setup data
 */
export async function getTOTPSetup(password: string) {
  const result = await twoFactor.getTotpUri({
    password,
  });
  return result;
}

/**
 * Reset Password API Route (Self-Service)
 *
 * POST: Reset password using email and verification code
 *
 * Security:
 * - Validates verification code matches and is not expired
 * - Max 5 verification attempts before lockout
 * - Updates user password hash in the account table using Better Auth's hashing
 * - Marks reset token as used
 * - Public endpoint (no authentication required)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, passwordResetTokens, userProfiles } from "@/db";
import { selfServiceResetPasswordSchema, safeValidate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { eq, and, isNull } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";
// Import Better Auth's password hashing to ensure compatibility
import { hashPassword } from "better-auth/crypto";

export const runtime = "edge";

/** Maximum number of verification attempts before lockout */
const MAX_VERIFICATION_ATTEMPTS = 5;

// =============================================================================
// POST: Reset Password with Verification Code
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = safeValidate(selfServiceResetPasswordSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const { email, verificationCode, newPassword } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Find the password reset token for this email
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.email, normalizedEmail),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);

    if (!resetToken) {
      return NextResponse.json(
        { error: "No password reset request found for this email. Please request a new code." },
        { status: 400 }
      );
    }

    // Check if locked due to too many failed attempts
    if (resetToken.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new verification code." },
        { status: 423 }
      );
    }

    // Check if verification code exists
    if (!resetToken.verificationCode) {
      return NextResponse.json(
        { error: "Please request a verification code first." },
        { status: 400 }
      );
    }

    // Check if verification code has expired
    if (!resetToken.verificationCodeExpiresAt || resetToken.verificationCodeExpiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if the verification code matches
    if (resetToken.verificationCode !== verificationCode) {
      // Increment failed attempts
      const newAttempts = resetToken.verificationAttempts + 1;
      await db
        .update(passwordResetTokens)
        .set({ verificationAttempts: newAttempts })
        .where(eq(passwordResetTokens.id, resetToken.id));

      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts;
      if (remainingAttempts <= 0) {
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new verification code." },
          { status: 423 }
        );
      }

      return NextResponse.json(
        { error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.` },
        { status: 400 }
      );
    }

    // Verify the user exists
    if (!resetToken.userId) {
      return NextResponse.json(
        { error: "User not found. Please contact support." },
        { status: 404 }
      );
    }

    const existingUser = await typedEnv.DB.prepare(
      `SELECT id, email FROM user WHERE id = ?1 LIMIT 1`
    ).bind(resetToken.userId).first<{ id: string; email: string }>();

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found. Please contact support." },
        { status: 404 }
      );
    }

    // Hash the new password using Better Auth's scrypt hashing
    const passwordHash = await hashPassword(newPassword);

    // Update the password in the Better Auth account table (credential provider)
    await typedEnv.DB.prepare(
      `UPDATE account SET password = ?1, updatedAt = ?2 WHERE userId = ?3 AND providerId = 'credential'`
    ).bind(passwordHash, new Date().toISOString(), existingUser.id).run();

    // Update the userProfile's passwordChangedAt if profile exists
    await db
      .update(userProfiles)
      .set({ passwordChangedAt: new Date() })
      .where(eq(userProfiles.userId, existingUser.id));

    // Mark the reset token as used and clear verification code
    await db
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Log audit
    await logAudit(
      db,
      {
        entityType: "user",
        entityId: existingUser.id,
        action: "password_reset_self_service",
        metadata: JSON.stringify({
          resetTokenId: resetToken.id,
        }),
      },
      {
        userId: existingUser.id,
        userEmail: existingUser.email,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      }
    );

    return NextResponse.json({
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "An error occurred while resetting your password. Please try again." },
      { status: 500 }
    );
  }
}

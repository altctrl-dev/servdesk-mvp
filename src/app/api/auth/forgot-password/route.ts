/**
 * Forgot Password API Route (Self-Service)
 *
 * POST: Request a password reset verification code
 *
 * Security:
 * - Always returns success to prevent email enumeration
 * - Max 3 codes per hour per email (rate limiting)
 * - Code expires in 10 minutes
 * - Public endpoint (no authentication required)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, passwordResetTokens, generateId } from "@/db";
import { sendPasswordResetCodeEmail } from "@/lib/resend";
import { forgotPasswordSchema, safeValidate } from "@/lib/validations";
import { eq, and, isNull } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

/** Maximum number of verification codes that can be sent per hour per email */
const MAX_CODES_PER_HOUR = 3;

/** Verification code expiry time in minutes */
const CODE_EXPIRY_MINUTES = 10;

/** Rate limit window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Generates a random 6-digit verification code.
 * Returns a string to preserve leading zeros (e.g., "012345").
 */
function generateVerificationCode(): string {
  const code = Math.floor(Math.random() * 1000000);
  return code.toString().padStart(6, "0");
}

// =============================================================================
// POST: Request Password Reset Code
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = safeValidate(forgotPasswordSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Check if user exists with this email (using raw SQL for Better Auth's user table)
    const existingUser = await typedEnv.DB.prepare(
      `SELECT id, email, name FROM user WHERE email = ?1 LIMIT 1`
    ).bind(normalizedEmail).first<{ id: string; email: string; name: string | null }>();

    // Always return success to prevent email enumeration
    // But only actually send the email if the user exists
    if (!existingUser) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a verification code shortly.",
      });
    }

    // Find existing password reset token for this email
    const [existingToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.email, normalizedEmail),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);

    const now = new Date();

    // Check rate limiting
    if (existingToken) {
      // Check if within rate limit window
      const windowStart = existingToken.rateLimitWindowStart;
      const isWithinWindow = windowStart && (now.getTime() - windowStart.getTime()) < RATE_LIMIT_WINDOW_MS;

      if (isWithinWindow && existingToken.verificationCodesSent >= MAX_CODES_PER_HOUR) {
        // Rate limited, but still return success to prevent enumeration
        console.log(`Rate limited password reset request for: ${normalizedEmail}`);
        return NextResponse.json({
          message: "If an account exists with this email, you will receive a verification code shortly.",
        });
      }

      // Check if locked due to too many failed attempts
      if (existingToken.verificationAttempts >= 5) {
        // Locked, but still return success to prevent enumeration
        console.log(`Locked password reset request for: ${normalizedEmail}`);
        return NextResponse.json({
          message: "If an account exists with this email, you will receive a verification code shortly.",
        });
      }
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000);

    if (existingToken) {
      // Update existing token with new code
      const windowStart = existingToken.rateLimitWindowStart;
      const isWithinWindow = windowStart && (now.getTime() - windowStart.getTime()) < RATE_LIMIT_WINDOW_MS;

      await db
        .update(passwordResetTokens)
        .set({
          userId: existingUser.id,
          verificationCode,
          verificationCodeExpiresAt,
          verificationCodesSent: isWithinWindow ? existingToken.verificationCodesSent + 1 : 1,
          rateLimitWindowStart: isWithinWindow ? existingToken.rateLimitWindowStart : now,
          // Reset attempts when sending new code
          verificationAttempts: 0,
        })
        .where(eq(passwordResetTokens.id, existingToken.id));
    } else {
      // Create new password reset token record
      // Note: token and expiresAt fields are required by original schema but not used in self-service flow
      // We use verificationCode and verificationCodeExpiresAt instead
      await db.insert(passwordResetTokens).values({
        id: generateId(),
        token: generateId(), // Required by schema, not used in self-service flow
        expiresAt: verificationCodeExpiresAt, // Required by schema
        userId: existingUser.id,
        email: normalizedEmail,
        verificationCode,
        verificationCodeExpiresAt,
        verificationCodesSent: 1,
        rateLimitWindowStart: now,
        verificationAttempts: 0,
      });
    }

    // Send verification code email
    const emailResult = await sendPasswordResetCodeEmail(typedEnv, {
      email: normalizedEmail,
      code: verificationCode,
    });

    // Log email result for debugging (visible in Cloudflare logs)
    if (!emailResult.success) {
      console.error("Failed to send password reset code email:", emailResult.error);
    } else {
      console.log("Password reset code email sent successfully:", emailResult.messageId);
    }

    // Always return success
    return NextResponse.json({
      message: "If an account exists with this email, you will receive a verification code shortly.",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    // Even on error, return a generic success to prevent enumeration
    return NextResponse.json({
      message: "If an account exists with this email, you will receive a verification code shortly.",
    });
  }
}

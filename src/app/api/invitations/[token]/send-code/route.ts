/**
 * Send Verification Code API Route
 *
 * POST: Send a verification code to the invited email address
 *
 * Security:
 * - Max 3 codes per invitation (rate limiting)
 * - Code expires in 10 minutes
 * - Validates invitation token before sending
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, invitations } from "@/db";
import { sendVerificationCodeEmail } from "@/lib/resend";
import { eq, and, gt, isNull } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

/** Maximum number of verification codes that can be sent per invitation */
const MAX_CODES_PER_INVITATION = 3;

/** Verification code expiry time in minutes */
const CODE_EXPIRY_MINUTES = 10;

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * Generates a random 6-digit verification code.
 * Returns a string to preserve leading zeros (e.g., "012345").
 */
function generateVerificationCode(): string {
  const code = Math.floor(Math.random() * 1000000);
  return code.toString().padStart(6, "0");
}

// =============================================================================
// POST: Send Verification Code
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Find valid, unexpired, unaccepted invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        )
      )
      .limit(1);

    if (!invitation) {
      // Check if token exists but is expired or already used
      const [expiredOrUsed] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1);

      if (expiredOrUsed) {
        if (expiredOrUsed.acceptedAt) {
          return NextResponse.json(
            { error: "This invitation has already been accepted" },
            { status: 410 }
          );
        }
        if (expiredOrUsed.expiresAt <= new Date()) {
          return NextResponse.json(
            { error: "This invitation has expired" },
            { status: 410 }
          );
        }
      }

      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation is locked due to too many verification attempts
    if (invitation.verificationAttempts >= 5) {
      return NextResponse.json(
        { error: "This invitation has been locked due to too many failed verification attempts" },
        { status: 423 }
      );
    }

    // Check rate limit for sending codes
    if (invitation.verificationCodesSent >= MAX_CODES_PER_INVITATION) {
      return NextResponse.json(
        { error: "Maximum number of verification codes sent. Please contact support." },
        { status: 429 }
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Update invitation with the new code
    await db
      .update(invitations)
      .set({
        verificationCode,
        verificationCodeExpiresAt,
        verificationCodesSent: invitation.verificationCodesSent + 1,
      })
      .where(eq(invitations.id, invitation.id));

    // Send verification code email
    const emailResult = await sendVerificationCodeEmail(typedEnv, {
      email: invitation.email,
      code: verificationCode,
    });

    // Log email result for debugging (visible in Cloudflare logs)
    if (!emailResult.success) {
      console.error("Failed to send verification code email:", emailResult.error);
    } else {
      console.log("Verification code email sent successfully:", emailResult.messageId);
    }

    // Always return success (don't reveal if email was actually sent for security)
    return NextResponse.json({
      message: "Verification code sent",
      codesSent: invitation.verificationCodesSent + 1,
      maxCodes: MAX_CODES_PER_INVITATION,
    });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

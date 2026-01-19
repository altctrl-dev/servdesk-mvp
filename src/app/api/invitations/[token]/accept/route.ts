/**
 * Accept Invitation API Route
 *
 * POST: Accept an invitation and create user account (public endpoint)
 *
 * Security:
 * - Requires email verification code
 * - Max 5 verification attempts before lockout
 * - Code expires in 10 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { createAuth } from "@/lib/auth";
import { getDb, invitations, userProfiles } from "@/db";
import { acceptInvitationSchema, safeValidate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { eq, and, gt, isNull } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

/** Maximum number of verification attempts before lockout */
const MAX_VERIFICATION_ATTEMPTS = 5;

interface RouteParams {
  params: Promise<{ token: string }>;
}

// =============================================================================
// POST: Accept Invitation (public endpoint)
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = safeValidate(acceptInvitationSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const { name, password, verificationCode } = validationResult.data;

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);
    const auth = createAuth(typedEnv);

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
    if (invitation.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      return NextResponse.json(
        { error: "This invitation has been locked due to too many failed verification attempts. Please contact support." },
        { status: 423 }
      );
    }

    // Verify the verification code
    if (!invitation.verificationCode) {
      return NextResponse.json(
        { error: "Please request a verification code first" },
        { status: 400 }
      );
    }

    // Check if verification code has expired
    if (!invitation.verificationCodeExpiresAt || invitation.verificationCodeExpiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if the verification code matches
    if (invitation.verificationCode !== verificationCode) {
      // Increment failed attempts
      const newAttempts = invitation.verificationAttempts + 1;
      await db
        .update(invitations)
        .set({ verificationAttempts: newAttempts })
        .where(eq(invitations.id, invitation.id));

      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts;
      if (remainingAttempts <= 0) {
        return NextResponse.json(
          { error: "Too many failed attempts. This invitation has been locked." },
          { status: 423 }
        );
      }

      return NextResponse.json(
        { error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.` },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await typedEnv.DB.prepare(
      `SELECT id FROM user WHERE email = ?1 LIMIT 1`
    ).bind(invitation.email.toLowerCase()).first();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Create user in Better Auth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: invitation.email,
        password,
        name,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    const newUserId = signUpResult.user.id;

    // Create user profile with invited role
    await db.insert(userProfiles).values({
      userId: newUserId,
      role: invitation.role,
      isActive: true,
    });

    // Mark invitation as accepted and clear verification code
    await db
      .update(invitations)
      .set({
        acceptedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
      })
      .where(eq(invitations.id, invitation.id));

    // Log audit
    await logAudit(
      db,
      {
        entityType: "user",
        entityId: newUserId,
        action: "created_via_invitation",
        metadata: JSON.stringify({
          invitationId: invitation.id,
          role: invitation.role,
        }),
      },
      {
        userId: newUserId,
        userEmail: invitation.email,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      }
    );

    return NextResponse.json(
      {
        user: {
          id: newUserId,
          email: invitation.email,
          name,
          role: invitation.role,
        },
        message: "Account created successfully. You can now log in.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

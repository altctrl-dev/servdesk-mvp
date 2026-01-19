/**
 * User Invitation API Route
 *
 * POST: Create and send a user invitation (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, invitations } from "@/db";
import { requireRole } from "@/lib/rbac";
import { inviteUserSchema, safeValidate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { sendInvitationEmail } from "@/lib/resend";
import { eq, and, gt } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// POST: Create Invitation (SUPER_ADMIN only)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Require SUPER_ADMIN role
    const session = await requireRole(["SUPER_ADMIN"]);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = safeValidate(inviteUserSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Check if user already exists using D1 directly
    const existingUser = await typedEnv.DB.prepare(
      `SELECT id FROM user WHERE email = ?1 LIMIT 1`
    ).bind(email.toLowerCase()).first();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Check for pending invitation for this email
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email.toLowerCase()),
          gt(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existingInvitation.length > 0 && !existingInvitation[0].acceptedAt) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Generate cryptographically secure token
    const token = crypto.randomUUID();

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        email: email.toLowerCase(),
        role,
        token,
        invitedById: session.user.id,
        expiresAt,
      })
      .returning();

    // Log audit
    await logAudit(
      db,
      {
        entityType: "invitation",
        entityId: invitation.id,
        action: "created",
        metadata: JSON.stringify({ email, role }),
      },
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      }
    );

    // Send invitation email
    const emailResult = await sendInvitationEmail(typedEnv, {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
      inviterName: session.user.name || session.user.email,
    });

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        emailSent: emailResult.success,
        message: emailResult.success
          ? "Invitation created and sent successfully"
          : "Invitation created but email could not be sent",
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

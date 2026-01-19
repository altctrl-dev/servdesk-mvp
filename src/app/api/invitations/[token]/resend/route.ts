/**
 * Resend Invitation Email API Route
 *
 * POST: Resend the full invitation email with the acceptance link (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, invitations } from "@/db";
import { requireRole } from "@/lib/rbac";
import { sendInvitationEmail } from "@/lib/resend";
import { eq, and, gt, isNull } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// =============================================================================
// POST: Resend Invitation Email (SUPER_ADMIN only)
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require SUPER_ADMIN role
    const session = await requireRole(["SUPER_ADMIN"]);

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
      return NextResponse.json(
        { error: "Invitation not found or expired" },
        { status: 404 }
      );
    }

    // Get inviter name from session
    const inviterName = session.user.name || session.user.email;

    // Send the invitation email
    const emailResult = await sendInvitationEmail(typedEnv, {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
      inviterName,
    });

    if (!emailResult.success) {
      console.error("Failed to resend invitation email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send invitation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Invitation email resent successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

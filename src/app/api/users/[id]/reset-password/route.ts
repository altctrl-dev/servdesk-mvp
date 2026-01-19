/**
 * Password Reset API Route
 *
 * POST: Trigger a password reset for a user (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, passwordResetTokens } from "@/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/resend";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// POST: Trigger Password Reset (SUPER_ADMIN only)
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require SUPER_ADMIN role
    const session = await requireRole(["SUPER_ADMIN"]);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Check if user exists using D1 directly
    const targetUser = await typedEnv.DB.prepare(
      `SELECT id, email, name FROM user WHERE id = ?1 LIMIT 1`
    ).bind(id).first<{ id: string; email: string; name: string | null }>();

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate cryptographically secure token
    const token = crypto.randomUUID();

    // Calculate expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Create password reset token
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        userId: id,
        token,
        expiresAt,
      })
      .returning();

    // Log audit
    await logAudit(
      db,
      {
        entityType: "password_reset",
        entityId: resetToken.id,
        action: "created",
        metadata: JSON.stringify({ targetUserId: id, targetEmail: targetUser.email }),
      },
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      }
    );

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(typedEnv, {
      user: {
        email: targetUser.email,
        name: targetUser.name,
        token: resetToken.token!,
        expiresAt: resetToken.expiresAt!,
      },
    });

    return NextResponse.json({
      message: emailResult.success
        ? "Password reset email sent successfully"
        : "Password reset created but email could not be sent",
      emailSent: emailResult.success,
      expiresAt: resetToken.expiresAt!.toISOString(),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error creating password reset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

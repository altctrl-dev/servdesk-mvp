/**
 * Invitation Management API Route
 *
 * DELETE: Cancel/delete an invitation (SUPER_ADMIN only)
 */

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, invitations } from "@/db";
import { requireRole } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// =============================================================================
// DELETE: Cancel Invitation (SUPER_ADMIN only)
// =============================================================================

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    // Require SUPER_ADMIN role
    await requireRole(["SUPER_ADMIN"]);

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

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Delete the invitation
    await db
      .delete(invitations)
      .where(eq(invitations.id, invitation.id));

    return NextResponse.json({
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

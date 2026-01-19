/**
 * Invitation Token Validation API Route
 *
 * GET: Validate an invitation token and return details (public endpoint)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, invitations } from "@/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// =============================================================================
// GET: Validate Invitation Token (public endpoint)
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Return invitation details (without sensitive info)
    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

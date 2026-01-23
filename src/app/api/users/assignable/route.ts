/**
 * Assignable Users API Route
 *
 * GET: Get list of users who can be assigned to tickets
 */

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, userProfiles } from "@/db";
import { requireRole } from "@/lib/rbac";
import { sql } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// GET: List Assignable Users
// =============================================================================

export async function GET() {
  try {
    // Require at least AGENT role to see assignable users
    try {
      await requireRole(["SUPER_ADMIN", "ADMIN", "AGENT"]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      const status = message.includes("Forbidden") ? 403 : 401;
      return NextResponse.json({ error: message }, { status });
    }

    const { env } = await getCloudflareContext();
    const db = getDb((env as CloudflareEnv).DB);

    // Get active users with SUPER_ADMIN or ADMIN roles
    const profiles = await db
      .select({
        userId: userProfiles.userId,
        role: userProfiles.role,
      })
      .from(userProfiles)
      .where(
        sql`${userProfiles.role} IN ('SUPER_ADMIN', 'ADMIN') AND ${userProfiles.isActive} = 1`
      );

    if (profiles.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get user details from the user table
    const userIds = profiles.map((p) => p.userId);
    const users = await db.all<{
      id: string;
      email: string;
      name: string | null;
    }>(
      sql`SELECT id, email, name FROM user WHERE id IN (${sql.join(
        userIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

    // Combine with role info
    const assignableUsers = users.map((user) => {
      const profile = profiles.find((p) => p.userId === user.id);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: profile?.role,
      };
    });

    return NextResponse.json({ users: assignableUsers });
  } catch (error) {
    console.error("Error fetching assignable users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * User Management API Route - Individual User
 *
 * GET: Get single user (SUPER_ADMIN only)
 * PATCH: Update user role/status (SUPER_ADMIN only)
 * DELETE: Deactivate user (SUPER_ADMIN only, cannot delete self)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, userProfiles } from "@/db";
import { requireRole } from "@/lib/rbac";
import { updateUserSchema, safeValidate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** User row from raw SQL query */
interface UserRow {
  id: string;
  email: string;
  name: string | null;
  emailVerified: number;
  image: string | null;
  createdAt: string;
  twoFactorEnabled: number | null;
  role: string | null;
  isActive: number | null;
  failedLoginAttempts: number | null;
  lockedUntil: number | null;
}

// =============================================================================
// GET: Get Single User (SUPER_ADMIN only)
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require SUPER_ADMIN role
    await requireRole(["SUPER_ADMIN"]);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;

    // Get user with profile using D1 directly
    const row = await typedEnv.DB.prepare(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.emailVerified,
        u.image,
        u.createdAt,
        u.twoFactorEnabled,
        COALESCE(up.role, 'VIEW_ONLY') as role,
        COALESCE(up.is_active, 1) as isActive,
        up.failed_login_attempts as failedLoginAttempts,
        up.locked_until as lockedUntil
      FROM user u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?1
      LIMIT 1
    `).bind(id).first<UserRow>();

    if (!row) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      emailVerified: Boolean(row.emailVerified),
      image: row.image,
      twoFactorEnabled: Boolean(row.twoFactorEnabled),
      role: row.role || "VIEW_ONLY",
      isActive: Boolean(row.isActive ?? 1),
      failedLoginAttempts: row.failedLoginAttempts || 0,
      lockedUntil: row.lockedUntil
        ? new Date(row.lockedUntil * 1000).toISOString()
        : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    };

    return NextResponse.json({ user });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error getting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH: Update User (SUPER_ADMIN only)
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = safeValidate(updateUserSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Ensure at least one field to update
    if (updates.role === undefined && updates.isActive === undefined) {
      return NextResponse.json(
        { error: "At least one field (role or isActive) must be provided" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
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

    // Prevent self-demotion (can't change own role)
    if (updates.role !== undefined && id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (updates.isActive === false && id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Get current profile to compare changes
    const currentProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, id))
      .limit(1);

    const oldRole = currentProfile[0]?.role || "VIEW_ONLY";
    const oldIsActive = currentProfile[0]?.isActive ?? true;

    // Build update values
    const updateValues: Partial<{
      role: typeof updates.role;
      isActive: typeof updates.isActive;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (updates.role !== undefined) {
      updateValues.role = updates.role;
    }

    if (updates.isActive !== undefined) {
      updateValues.isActive = updates.isActive;
    }

    // Check if profile exists, create or update
    if (currentProfile.length === 0) {
      // Create new profile
      await db.insert(userProfiles).values({
        userId: id,
        role: updates.role || "VIEW_ONLY",
        isActive: updates.isActive ?? true,
      });
    } else {
      // Update existing profile
      await db
        .update(userProfiles)
        .set(updateValues)
        .where(eq(userProfiles.userId, id));
    }

    // Log audit for role change
    if (updates.role !== undefined && updates.role !== oldRole) {
      await logAudit(
        db,
        {
          entityType: "user",
          entityId: id,
          action: "role_changed",
          field: "role",
          oldValue: oldRole,
          newValue: updates.role,
        },
        {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: request.headers.get("x-forwarded-for") || undefined,
        }
      );
    }

    // Log audit for activation status change
    if (updates.isActive !== undefined && updates.isActive !== oldIsActive) {
      await logAudit(
        db,
        {
          entityType: "user",
          entityId: id,
          action: updates.isActive ? "activated" : "deactivated",
          field: "isActive",
          oldValue: String(oldIsActive),
          newValue: String(updates.isActive),
        },
        {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: request.headers.get("x-forwarded-for") || undefined,
        }
      );
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        id,
        email: targetUser.email,
        name: targetUser.name,
        role: updates.role ?? oldRole,
        isActive: updates.isActive ?? oldIsActive,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Deactivate User (SUPER_ADMIN only)
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
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

    // Check if profile exists
    const currentProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, id))
      .limit(1);

    // We don't actually delete the user, just deactivate them
    // This preserves audit history and allows reactivation
    if (currentProfile.length === 0) {
      // Create new profile with isActive = false
      await db.insert(userProfiles).values({
        userId: id,
        role: "VIEW_ONLY",
        isActive: false,
      });
    } else {
      // Update existing profile
      await db
        .update(userProfiles)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, id));
    }

    // Log audit
    await logAudit(
      db,
      {
        entityType: "user",
        entityId: id,
        action: "deactivated",
        field: "isActive",
        oldValue: String(currentProfile[0]?.isActive ?? true),
        newValue: "false",
      },
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      }
    );

    return NextResponse.json({
      message: "User deactivated successfully",
      user: {
        id,
        email: targetUser.email,
        name: targetUser.name,
        isActive: false,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

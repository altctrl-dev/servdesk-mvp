/**
 * User Management API Route
 *
 * GET: List all users with pagination (SUPER_ADMIN only)
 * POST: Create a new user (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { createAuth } from "@/lib/auth";
import { getDb, userProfiles, invitations } from "@/db";
import { requireRole } from "@/lib/rbac";
import { createUserSchema, userFilterSchema, safeValidate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { eq, and, count, isNull, gt } from "drizzle-orm";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

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
// GET: List Users (SUPER_ADMIN only)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Require SUPER_ADMIN role
    await requireRole(["SUPER_ADMIN"]);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const filterResult = safeValidate(userFilterSchema, {
      role: searchParams.get("role") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    if (!filterResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${filterResult.error}` },
        { status: 400 }
      );
    }

    const filters = filterResult.data;
    const offset = (filters.page - 1) * filters.limit;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Build filter conditions for user_profiles
    const conditions = [];

    if (filters.role) {
      conditions.push(eq(userProfiles.role, filters.role));
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(userProfiles.isActive, filters.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count from user_profiles
    const [countResult] = await db
      .select({ count: count() })
      .from(userProfiles)
      .where(whereClause);

    const total = countResult?.count || 0;

    // Use D1 directly for the JOIN query with Better Auth's user table
    // Drizzle doesn't have the user table in our schema since it's managed by Better Auth
    const queryResult = await typedEnv.DB.prepare(`
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
      ORDER BY u.createdAt DESC
      LIMIT ?1
      OFFSET ?2
    `).bind(filters.limit, offset).all<UserRow>();

    // Filter by role/isActive if specified (since the WHERE clause in SQL needs proper handling)
    let filteredResults = queryResult.results;

    if (filters.role) {
      filteredResults = filteredResults.filter(row => row.role === filters.role);
    }

    if (filters.isActive !== undefined) {
      filteredResults = filteredResults.filter(
        row => Boolean(row.isActive) === filters.isActive
      );
    }

    // Format response
    const users = filteredResults.map((row) => ({
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
    }));

    // Fetch pending invitations (not accepted, not expired)
    const pendingInvitations = await db
      .select()
      .from(invitations)
      .where(
        and(
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date())
        )
      )
      .orderBy(invitations.createdAt);

    const formattedInvitations = pendingInvitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));

    return NextResponse.json({
      users,
      pendingInvitations: formattedInvitations,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: users.length, // Use actual filtered count
        totalPages: Math.ceil(total / filters.limit),
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

    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create User (SUPER_ADMIN only)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Require SUPER_ADMIN role
    const session = await requireRole(["SUPER_ADMIN"]);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = safeValidate(createUserSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const { email, name, password, role } = validationResult.data;

    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const auth = createAuth(typedEnv);
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

    // Create user in Better Auth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const newUserId = signUpResult.user.id;

    // Create user profile with role
    await db.insert(userProfiles).values({
      userId: newUserId,
      role,
      isActive: true,
    });

    // Log audit
    await logAudit(
      db,
      {
        entityType: "user",
        entityId: newUserId,
        action: "created",
        metadata: JSON.stringify({ role }),
      },
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      }
    );

    return NextResponse.json(
      {
        user: {
          id: newUserId,
          email,
          name,
          role,
          isActive: true,
        },
        message: "User created successfully",
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

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

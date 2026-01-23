/**
 * Views API Route
 *
 * GET: List user's own views + all shared views (any authenticated user)
 * POST: Create a new view (personal for all, shared for SUPERVISOR+)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, savedViews, type ViewFilters } from "@/db";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for view filters configuration
 */
const viewFiltersSchema = z.object({
  status: z.array(z.enum(["NEW", "OPEN", "PENDING_CUSTOMER", "ON_HOLD", "RESOLVED", "CLOSED"])).optional(),
  priority: z.array(z.enum(["NORMAL", "HIGH", "URGENT"])).optional(),
  assignedTo: z.union([z.string(), z.literal("unassigned"), z.literal("me")]).optional(),
  search: z.string().optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
}).strict();

/**
 * Schema for creating a new view
 */
const createViewSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  filters: viewFiltersSchema,
  columns: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  isShared: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false),
});

// =============================================================================
// GET: List Views (any authenticated user)
// =============================================================================

export async function GET() {
  try {
    // Require any authenticated user
    const session = await getSessionWithRole();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "Unauthorized: Account is disabled" },
        { status: 403 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get user's own views
    const userViews = await db
      .select()
      .from(savedViews)
      .where(eq(savedViews.userId, session.user.id))
      .orderBy(savedViews.createdAt);

    // Get all shared views (from any user)
    const sharedViewsResult = await db
      .select()
      .from(savedViews)
      .where(eq(savedViews.isShared, true))
      .orderBy(savedViews.createdAt);

    // Format response
    const formatView = (view: typeof savedViews.$inferSelect) => ({
      id: view.id,
      name: view.name,
      description: view.description,
      userId: view.userId,
      filters: JSON.parse(view.filters) as ViewFilters,
      columns: view.columns ? JSON.parse(view.columns) as string[] : null,
      sortBy: view.sortBy,
      sortOrder: view.sortOrder,
      isShared: view.isShared,
      isDefault: view.isDefault,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    });

    return NextResponse.json({
      views: userViews.map(formatView),
      sharedViews: sharedViewsResult
        .filter((v) => v.userId !== session.user.id) // Exclude user's own views from shared list
        .map(formatView),
    });
  } catch (error) {
    console.error("Error listing views:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create View (any authenticated user, shared requires SUPERVISOR+)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Require any authenticated user
    const session = await getSessionWithRole();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "Unauthorized: Account is disabled" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createViewSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      filters,
      columns,
      sortBy,
      sortOrder,
      isShared,
      isDefault,
    } = validationResult.data;

    // Check permission for creating shared views
    if (isShared && !hasAnyRole(session.roles, ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"])) {
      return NextResponse.json(
        { error: "Forbidden: Only SUPERVISOR, ADMIN, or SUPER_ADMIN can create shared views" },
        { status: 403 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // If isDefault is true, unset any existing default for this user
    if (isDefault) {
      await db
        .update(savedViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(savedViews.userId, session.user.id));
    }

    // Create the view
    const [newView] = await db
      .insert(savedViews)
      .values({
        name,
        description: description || null,
        userId: session.user.id,
        filters: JSON.stringify(filters),
        columns: columns ? JSON.stringify(columns) : null,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "desc",
        isShared: isShared || false,
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json(
      {
        view: {
          id: newView.id,
          name: newView.name,
          description: newView.description,
          userId: newView.userId,
          filters: JSON.parse(newView.filters) as ViewFilters,
          columns: newView.columns ? JSON.parse(newView.columns) as string[] : null,
          sortBy: newView.sortBy,
          sortOrder: newView.sortOrder,
          isShared: newView.isShared,
          isDefault: newView.isDefault,
          createdAt: newView.createdAt.toISOString(),
          updatedAt: newView.updatedAt.toISOString(),
        },
        message: "View created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

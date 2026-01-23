/**
 * Views API Route - Individual View
 *
 * GET: Get single view (owner OR shared view)
 * PATCH: Update view (owner only)
 * DELETE: Delete view (owner only)
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * Schema for updating a view
 */
const updateViewSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less").optional(),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  filters: viewFiltersSchema.optional(),
  columns: z.array(z.string()).optional().nullable(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// =============================================================================
// GET: Get Single View (owner or shared)
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "View ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the view
    const [view] = await db
      .select()
      .from(savedViews)
      .where(eq(savedViews.id, id))
      .limit(1);

    if (!view) {
      return NextResponse.json(
        { error: "View not found" },
        { status: 404 }
      );
    }

    // Check access: owner OR shared view
    const isOwner = view.userId === session.user.id;
    const canAccess = isOwner || view.isShared;

    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this view" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      view: {
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
      },
    });
  } catch (error) {
    console.error("Error getting view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH: Update View (owner only)
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "View ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateViewSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the view
    const [existingView] = await db
      .select()
      .from(savedViews)
      .where(eq(savedViews.id, id))
      .limit(1);

    if (!existingView) {
      return NextResponse.json(
        { error: "View not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingView.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the view owner can update this view" },
        { status: 403 }
      );
    }

    // Check permission for changing to shared
    if (updates.isShared === true && !existingView.isShared) {
      if (!hasAnyRole(session.roles, ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"])) {
        return NextResponse.json(
          { error: "Forbidden: Only SUPERVISOR, ADMIN, or SUPER_ADMIN can make views shared" },
          { status: 403 }
        );
      }
    }

    // If isDefault is true, unset any existing default for this user
    if (updates.isDefault === true && !existingView.isDefault) {
      await db
        .update(savedViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(savedViews.userId, session.user.id));
    }

    // Build update values
    const updateValues: Partial<typeof savedViews.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) {
      updateValues.name = updates.name;
    }

    if (updates.description !== undefined) {
      updateValues.description = updates.description;
    }

    if (updates.filters !== undefined) {
      updateValues.filters = JSON.stringify(updates.filters);
    }

    if (updates.columns !== undefined) {
      updateValues.columns = updates.columns ? JSON.stringify(updates.columns) : null;
    }

    if (updates.sortBy !== undefined) {
      updateValues.sortBy = updates.sortBy;
    }

    if (updates.sortOrder !== undefined) {
      updateValues.sortOrder = updates.sortOrder;
    }

    if (updates.isShared !== undefined) {
      updateValues.isShared = updates.isShared;
    }

    if (updates.isDefault !== undefined) {
      updateValues.isDefault = updates.isDefault;
    }

    // Update the view
    const [updatedView] = await db
      .update(savedViews)
      .set(updateValues)
      .where(eq(savedViews.id, id))
      .returning();

    return NextResponse.json({
      view: {
        id: updatedView.id,
        name: updatedView.name,
        description: updatedView.description,
        userId: updatedView.userId,
        filters: JSON.parse(updatedView.filters) as ViewFilters,
        columns: updatedView.columns ? JSON.parse(updatedView.columns) as string[] : null,
        sortBy: updatedView.sortBy,
        sortOrder: updatedView.sortOrder,
        isShared: updatedView.isShared,
        isDefault: updatedView.isDefault,
        createdAt: updatedView.createdAt.toISOString(),
        updatedAt: updatedView.updatedAt.toISOString(),
      },
      message: "View updated successfully",
    });
  } catch (error) {
    console.error("Error updating view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Delete View (owner only)
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "View ID is required" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database
    const { env } = await getCloudflareContext();
    const typedEnv = env as CloudflareEnv;
    const db = getDb(typedEnv.DB);

    // Get the view
    const [existingView] = await db
      .select()
      .from(savedViews)
      .where(eq(savedViews.id, id))
      .limit(1);

    if (!existingView) {
      return NextResponse.json(
        { error: "View not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingView.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the view owner can delete this view" },
        { status: 403 }
      );
    }

    // Delete the view
    await db
      .delete(savedViews)
      .where(eq(savedViews.id, id));

    return NextResponse.json({
      success: true,
      message: "View deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

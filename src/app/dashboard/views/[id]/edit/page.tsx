/**
 * Edit View Page
 *
 * Form to edit an existing custom ticket view.
 * Only the view owner can edit their views.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { EditViewForm } from "@/components/admin/edit-view-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { UserRole } from "@/db/schema";

export const runtime = "edge";

// All authenticated roles can edit their own views
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// Roles that can share views with the team
const CAN_SHARE_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

interface EditViewPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditViewPage({ params }: EditViewPageProps) {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  // Check role-based access
  if (!hasAnyRole(session.roles, ALLOWED_ROLES)) {
    redirect("/dashboard?error=unauthorized");
  }

  const { id } = await params;

  // Determine if user can share views
  const canShare = hasAnyRole(session.roles, CAN_SHARE_ROLES);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/views">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit View</h1>
          <p className="text-muted-foreground">
            Update your custom view filters and settings
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <EditViewForm viewId={id} userId={session.user.id} canShare={canShare} />
      </div>
    </div>
  );
}

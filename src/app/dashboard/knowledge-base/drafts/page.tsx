/**
 * Knowledge Base Drafts Page
 *
 * Displays draft articles awaiting review or publication.
 * Accessible to supervisors and above.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { UserRole } from "@/db/schema";
import { DraftsListClient } from "./drafts-list-client";

export const runtime = "edge";

// Supervisors and above can access this page
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// ADMIN+ can publish/archive articles
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function DraftsPage() {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  // Check role-based access (SUPERVISOR+ only)
  if (!hasAnyRole(session.roles, SUPERVISOR_ROLES)) {
    redirect("/dashboard?error=unauthorized");
  }

  const canEdit = hasAnyRole(session.roles, SUPERVISOR_ROLES);
  const canPublish = hasAnyRole(session.roles, ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Draft Articles"
        description="Articles awaiting review or publication"
        actions={
          <Link href="/dashboard/knowledge-base/articles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </Link>
        }
      />

      <DraftsListClient canEdit={canEdit} canPublish={canPublish} />
    </div>
  );
}

/**
 * Knowledge Base Tags Page
 *
 * Manage knowledge base tags.
 * Accessible to admins and above.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import type { UserRole } from "@/db/schema";
import { TagsClient } from "./tags-client";

export const runtime = "edge";

// Admins and above can access this page
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function TagsPage() {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  // Check role-based access (ADMIN+ only)
  if (!hasAnyRole(session.roles, ADMIN_ROLES)) {
    redirect("/dashboard?error=unauthorized");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Tags"
        description="Create and manage tags to label knowledge base articles"
      />

      <TagsClient />
    </div>
  );
}

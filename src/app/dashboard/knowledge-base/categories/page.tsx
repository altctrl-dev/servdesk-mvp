/**
 * Knowledge Base Categories Page
 *
 * Manage knowledge base categories and organization.
 * Accessible to admins and above.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import type { UserRole } from "@/db/schema";
import { CategoriesClient } from "./categories-client";

export const runtime = "edge";

// Admins and above can access this page
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function CategoriesPage() {
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
        title="Manage Categories"
        description="Organize knowledge base articles into categories"
      />

      <CategoriesClient />
    </div>
  );
}

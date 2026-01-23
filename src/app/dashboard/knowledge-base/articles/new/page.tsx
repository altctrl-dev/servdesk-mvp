/**
 * New Article Page
 *
 * Create a new knowledge base article.
 * Only accessible to SUPERVISOR, ADMIN, and SUPER_ADMIN roles.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import type { UserRole } from "@/db/schema";
import { ArticleFormClient } from "./article-form-client";

export const runtime = "edge";

// SUPERVISOR+ can create articles
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function NewArticlePage() {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  // Check role-based access
  if (!hasAnyRole(session.roles, SUPERVISOR_ROLES)) {
    redirect("/dashboard/knowledge-base/articles?error=unauthorized");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Article"
        description="Write a new knowledge base article"
      />

      <div className="max-w-3xl">
        <ArticleFormClient />
      </div>
    </div>
  );
}

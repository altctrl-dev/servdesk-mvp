/**
 * Knowledge Base Articles Page
 *
 * Displays published knowledge base articles.
 * Accessible to all authenticated roles.
 * SUPERVISOR+ can create new articles.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { UserRole } from "@/db/schema";
import { ArticlesListClient } from "./articles-list-client";

export const runtime = "edge";

// All authenticated roles can access this page
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// SUPERVISOR+ can create/edit articles
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// ADMIN+ can publish/archive articles
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function ArticlesPage() {
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

  const canEdit = hasAnyRole(session.roles, SUPERVISOR_ROLES);
  const canPublish = hasAnyRole(session.roles, ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base Articles"
        description="Browse and search knowledge base articles"
        actions={
          canEdit ? (
            <Link href="/dashboard/knowledge-base/articles/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </Link>
          ) : null
        }
      />

      <ArticlesListClient canEdit={canEdit} canPublish={canPublish} />
    </div>
  );
}

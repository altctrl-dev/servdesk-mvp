/**
 * Edit Article Page
 *
 * Edit an existing knowledge base article.
 * Only accessible to SUPERVISOR, ADMIN, and SUPER_ADMIN roles.
 */

import { redirect, notFound } from "next/navigation";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import type { UserRole } from "@/db/schema";
import { ArticleEditClient } from "./article-edit-client";

export const runtime = "edge";

// SUPERVISOR+ can edit articles
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
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

  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <ArticleEditClient articleId={id} />;
}

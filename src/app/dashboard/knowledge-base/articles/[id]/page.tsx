/**
 * Article Detail Page
 *
 * Displays full article content with metadata.
 * Accessible to all authenticated users.
 * SUPERVISOR+ can edit, ADMIN+ can publish/archive.
 */

import { redirect, notFound } from "next/navigation";
import { getSessionWithRole, hasAnyRole } from "@/lib/rbac";
import type { UserRole } from "@/db/schema";
import { ArticleDetailClient } from "./article-detail-client";

export const runtime = "edge";

// All authenticated roles can view articles
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// SUPERVISOR+ can edit articles
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// ADMIN+ can publish/archive articles
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

interface ArticleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
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

  if (!id) {
    notFound();
  }

  const canEdit = hasAnyRole(session.roles, SUPERVISOR_ROLES);
  const canPublish = hasAnyRole(session.roles, ADMIN_ROLES);

  return (
    <ArticleDetailClient
      articleId={id}
      canEdit={canEdit}
      canPublish={canPublish}
    />
  );
}

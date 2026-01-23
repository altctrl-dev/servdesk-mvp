/**
 * Knowledge Base Overview Page
 *
 * Main landing page for the Knowledge Base section.
 * Shows quick stats and navigation to subsections.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { getCloudflareContext } from "@/lib/cf-context";
import { getDb, kbArticles, kbCategories, kbTags } from "@/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import {
  FileText,
  FolderOpen,
  Tags,
  FilePen,
  Plus,
  ArrowRight,
  Eye,
} from "lucide-react";
import { eq, desc, count } from "drizzle-orm";
import type { UserRole } from "@/db/schema";
import type { CloudflareEnv } from "@/env";

export const runtime = "edge";

// All authenticated roles can access this page
const ALLOWED_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// SUPERVISOR+ can create/edit articles and see drafts
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

// ADMIN+ can manage categories and tags
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default async function KnowledgeBasePage() {
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

  const isSupervisor = hasAnyRole(session.roles, SUPERVISOR_ROLES);
  const isAdmin = hasAnyRole(session.roles, ADMIN_ROLES);

  // Get Cloudflare context and database
  const { env } = await getCloudflareContext();
  const typedEnv = env as CloudflareEnv;
  const db = getDb(typedEnv.DB);

  // Fetch stats
  const [totalArticles] = await db.select({ count: count() }).from(kbArticles);
  const [publishedArticles] = await db
    .select({ count: count() })
    .from(kbArticles)
    .where(eq(kbArticles.status, "PUBLISHED"));
  const [draftArticles] = await db
    .select({ count: count() })
    .from(kbArticles)
    .where(eq(kbArticles.status, "DRAFT"));
  const [totalCategories] = await db.select({ count: count() }).from(kbCategories);
  const [totalTags] = await db.select({ count: count() }).from(kbTags);

  // Fetch recent published articles
  const recentArticles = await db
    .select({
      id: kbArticles.id,
      title: kbArticles.title,
      slug: kbArticles.slug,
      viewCount: kbArticles.viewCount,
      publishedAt: kbArticles.publishedAt,
    })
    .from(kbArticles)
    .where(eq(kbArticles.status, "PUBLISHED"))
    .orderBy(desc(kbArticles.publishedAt))
    .limit(5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Manage and browse knowledge base articles"
        actions={
          isSupervisor ? (
            <Link href="/dashboard/knowledge-base/articles/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </Link>
          ) : null
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Articles"
          value={totalArticles?.count || 0}
          icon={FileText}
        />
        <StatsCard
          title="Published"
          value={publishedArticles?.count || 0}
          icon={Eye}
        />
        {isSupervisor && (
          <StatsCard
            title="Drafts"
            value={draftArticles?.count || 0}
            icon={FilePen}
          />
        )}
        {isAdmin && (
          <>
            <StatsCard
              title="Categories"
              value={totalCategories?.count || 0}
              icon={FolderOpen}
            />
            <StatsCard
              title="Tags"
              value={totalTags?.count || 0}
              icon={Tags}
            />
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Browse Articles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Articles
            </CardTitle>
            <CardDescription>
              Browse and search all knowledge base articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/knowledge-base/articles">
              <Button variant="outline" className="w-full">
                Browse Articles
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Drafts (SUPERVISOR+) */}
        {isSupervisor && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FilePen className="h-5 w-5" />
                Drafts
              </CardTitle>
              <CardDescription>
                Review and publish draft articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/knowledge-base/drafts">
                <Button variant="outline" className="w-full">
                  View Drafts
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Categories (ADMIN+) */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Categories
              </CardTitle>
              <CardDescription>
                Manage article categories and hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/knowledge-base/categories">
                <Button variant="outline" className="w-full">
                  Manage Categories
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Tags (ADMIN+) */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Tags
              </CardTitle>
              <CardDescription>
                Create and manage article tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/knowledge-base/tags">
                <Button variant="outline" className="w-full">
                  Manage Tags
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Articles</CardTitle>
            <CardDescription>
              Latest published knowledge base articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/dashboard/knowledge-base/articles/${article.id}`}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{article.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.viewCount}
                    </span>
                    {article.publishedAt && (
                      <span>
                        {new Date(article.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/dashboard/knowledge-base/articles">
                <Button variant="ghost" className="w-full">
                  View All Articles
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

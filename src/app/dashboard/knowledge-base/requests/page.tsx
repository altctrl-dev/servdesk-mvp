/**
 * Knowledge Base Requests Page
 *
 * Placeholder page for customer article requests.
 * Accessible to supervisors and above.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquarePlus, Clock } from "lucide-react";
import type { UserRole } from "@/db/schema";

export const runtime = "edge";

// Supervisors and above can access this page
const SUPERVISOR_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function RequestsPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Article Requests"
        description="Customer requests for new knowledge base articles"
      />

      <Card className="max-w-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
          <CardDescription className="text-base">
            This feature is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p className="max-w-md mx-auto">
            The Article Requests feature will allow customers to request new knowledge base
            articles directly. You will be able to track, prioritize, and fulfill these
            requests to continuously improve your knowledge base.
          </p>
          <div className="mt-6 space-y-2 text-left max-w-sm mx-auto">
            <p className="font-medium text-foreground">Planned features:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Customer request submission portal</li>
              <li>Request prioritization and tracking</li>
              <li>Assignment to content authors</li>
              <li>Status updates and notifications</li>
              <li>Analytics on common requests</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * CSAT Reports Page
 *
 * Customer Satisfaction reports - Coming Soon placeholder.
 * Accessible to supervisors and above.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/permissions";
import type { UserRole } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SmilePlus, MessageSquareText, Star, TrendingUp } from "lucide-react";

export const runtime = 'edge';

// Supervisors and above can access this page
const ALLOWED_ROLES: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

export default async function CSATReportsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CSAT Reports</h1>
        <p className="text-muted-foreground">
          Customer Satisfaction metrics and feedback analysis
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <SmilePlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Coming Soon</CardTitle>
          <CardDescription>
            CSAT reporting features are currently in development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            We are building comprehensive customer satisfaction reporting to help you
            measure and improve your support quality.
          </p>

          <div className="mx-auto max-w-lg">
            <h3 className="mb-4 text-sm font-medium text-center">Planned Features</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Satisfaction Scores</p>
                  <p className="text-xs text-muted-foreground">
                    Track CSAT, NPS, and CES scores over time
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <MessageSquareText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Feedback Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Analyze customer comments and sentiment
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Trend Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Identify patterns and improvement areas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <SmilePlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Agent Ratings</p>
                  <p className="text-xs text-muted-foreground">
                    Per-agent satisfaction breakdowns
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

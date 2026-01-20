/**
 * Dashboard Layout
 *
 * Provides the main layout structure for the admin dashboard.
 * Uses the reusable LayoutWrapper with dashboard-specific configuration.
 * Protected by authentication - redirects to login if not authenticated.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const runtime = "edge";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  if (!session.isActive) {
    redirect("/login?error=account_disabled");
  }

  return (
    <DashboardLayout
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
      role={session.role}
    >
      {children}
    </DashboardLayout>
  );
}

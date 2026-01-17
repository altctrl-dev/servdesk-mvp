/**
 * Dashboard Layout
 *
 * Provides the main layout structure for the admin dashboard.
 * Includes sidebar navigation and header with user info.
 * Protected by authentication - redirects to login if not authenticated.
 */

import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/rbac";
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";
import { Toaster } from "@/components/ui/toaster";

export const runtime = 'edge';

export default async function DashboardLayout({
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
    <div className="flex min-h-screen">
      <Sidebar userRole={session.role} />

      <div className="flex flex-1 flex-col">
        <Header
          user={{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
          role={session.role}
        />

        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}

/**
 * Settings Page - Root
 *
 * Landing page for settings section.
 * Redirects to security settings or shows settings overview.
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ChevronRight } from "lucide-react";

export default async function SettingsPage() {
  // Require SUPER_ADMIN role for settings
  try {
    await requireRole(["SUPER_ADMIN"]);
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and system settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Security Settings Card */}
        <Link href="/dashboard/settings/security">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Security
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="flex items-center justify-between">
                <span>Two-factor authentication and security settings</span>
                <ChevronRight className="h-4 w-4" />
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

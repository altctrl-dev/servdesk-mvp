/**
 * Security Settings Page - MFA Configuration
 *
 * Allows users to view and manage their two-factor authentication settings.
 * Features:
 * - View current 2FA status
 * - Enable/disable 2FA
 * - Show QR code for TOTP setup
 * - Display backup codes
 */

import { requireAuth } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { MFASettings } from "./mfa-settings";

export default async function SecuritySettingsPage() {
  // Require authentication
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security and two-factor authentication
        </p>
      </div>

      <MFASettings
        userId={session.user.id}
        userEmail={session.user.email}
        twoFactorEnabled={session.user.twoFactorEnabled ?? false}
      />
    </div>
  );
}

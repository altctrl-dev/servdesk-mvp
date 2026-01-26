"use client";

/**
 * MFA Settings Component
 *
 * Since we use Microsoft OAuth, MFA is managed through Microsoft.
 * This component informs users how to manage their MFA settings.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink } from "lucide-react";

interface MFASettingsProps {
  userId: string;
  userEmail: string;
  twoFactorEnabled: boolean;
}

export function MFASettings({
  userId: _userId,
  userEmail: _userEmail,
  twoFactorEnabled: _twoFactorEnabled,
}: MFASettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Managed through your Microsoft account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Since you sign in with Microsoft, your two-factor authentication and security
          settings are managed through your Microsoft account. This provides enterprise-grade
          security including:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Microsoft Authenticator app</li>
          <li>SMS verification</li>
          <li>Hardware security keys</li>
          <li>Passwordless authentication</li>
        </ul>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => window.open("https://mysignins.microsoft.com/security-info", "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Manage Microsoft Security Settings
        </Button>
      </CardContent>
    </Card>
  );
}

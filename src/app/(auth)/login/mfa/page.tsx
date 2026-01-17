/**
 * MFA Verification Page
 *
 * Provides TOTP code verification for two-factor authentication.
 * Users are redirected here after successful password authentication
 * if they have 2FA enabled.
 */

import { MfaForm } from "@/components/auth/mfa-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MfaPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MfaForm />
      </CardContent>
    </Card>
  );
}

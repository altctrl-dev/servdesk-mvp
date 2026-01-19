/**
 * Forgot Password Page
 *
 * Public page for self-service password reset.
 * Flow:
 * 1. User enters email address
 * 2. System sends verification code to email
 * 3. User enters code and new password
 * 4. Password is reset, user redirected to login
 */

export const runtime = "edge";

import { Suspense } from "react";
import { ForgotPasswordForm } from "./forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Loading fallback for the form */
function FormFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-12 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="h-10 bg-muted rounded" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          Enter your email to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<FormFallback />}>
          <ForgotPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

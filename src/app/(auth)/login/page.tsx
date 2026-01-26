/**
 * Login Page
 *
 * Provides Microsoft OAuth authentication.
 * Redirects to dashboard on successful login.
 */

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Loading fallback for the login form */
function LoginFormFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-muted rounded" />
      <div className="h-4 w-3/4 mx-auto bg-muted rounded" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Sign in with your Microsoft account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

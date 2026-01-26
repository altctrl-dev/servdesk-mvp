/**
 * Login Page
 *
 * Provides Microsoft OAuth authentication.
 * Redirects to dashboard if already authenticated.
 */

import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export const runtime = "edge";
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

export default async function LoginPage() {
  // Check if user has a session cookie - redirect to dashboard
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.get("__Secure-servdesk.session_token") ||
    cookieStore.get("servdesk.session_token") ||
    cookieStore.get("better-auth.session_token");

  if (hasSession) {
    redirect("/dashboard");
  }

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

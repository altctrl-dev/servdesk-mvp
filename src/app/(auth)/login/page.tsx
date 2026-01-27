/**
 * Login Page
 *
 * Renders the same landing experience as the home page.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/components/marketing/home-landing";

export const runtime = "edge";

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

  return <HomeLanding />;
}

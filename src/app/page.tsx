import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "edge";

export default async function HomePage() {
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
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          ServDesk MVP
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          AI-powered service desk for small businesses
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/login"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Get Started
          </a>
          <a
            href="/api/health"
            className="text-sm font-semibold leading-6 text-foreground"
          >
            Health Check <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}

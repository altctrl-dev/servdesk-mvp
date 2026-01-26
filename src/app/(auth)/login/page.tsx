/**
 * Login Page
 *
 * Provides Microsoft OAuth authentication.
 * Redirects to dashboard if already authenticated.
 */

import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ArrowRight, CheckCircle2, ShieldCheck, Ticket } from "lucide-react";

export const runtime = "edge";

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
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70">
            <Ticket className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">ServDesk</div>
            <div className="text-xs text-slate-400">
              Servsys Customer Support Portal
            </div>
          </div>
        </div>
      </header>

      <main className="mt-10 grid flex-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <section className="space-y-8">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="w-fit border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
            >
              Private ticketing workspace
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              A modern ticketing hub built for Servsys support teams.
            </h1>
            <p className="max-w-xl text-base text-slate-300">
              Centralize inbound requests, keep SLAs visible, and give requesters
              a secure way to track their tickets without creating accounts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <ShieldCheck className="h-5 w-5 text-cyan-200" />
              <p className="mt-3 text-sm font-semibold text-white">
                Secure by default
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Microsoft SSO with invite-only access.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <CheckCircle2 className="h-5 w-5 text-cyan-200" />
              <p className="mt-3 text-sm font-semibold text-white">
                SLA-focused workflows
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Track escalations and response targets.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <Ticket className="h-5 w-5 text-cyan-200" />
              <p className="mt-3 text-sm font-semibold text-white">
                Unified ticket view
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Inbox, queues, and audits in one place.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle2 className="h-4 w-4 text-cyan-200" />
              Requester tracking flow
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                  1
                </span>
                <div>
                  <p className="font-medium text-white">Enter ticket ID</p>
                  <p className="text-xs text-slate-400">
                    Use the ID from your Servsys confirmation email.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                  2
                </span>
                <div>
                  <p className="font-medium text-white">Verify via email code</p>
                  <p className="text-xs text-slate-400">
                    We send a one-time code to the ticket requester.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                  3
                </span>
                <div>
                  <p className="font-medium text-white">View status</p>
                  <p className="text-xs text-slate-400">
                    See updates, assignee, and next steps securely.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="space-y-6">
          <Card className="border-white/10 bg-slate-900/70 text-slate-100 shadow-xl shadow-black/30">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl">Staff sign in</CardTitle>
              <CardDescription className="text-slate-300">
                Use your Servsys Microsoft account to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoginFormFallback />}>
                <LoginForm />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/60 text-slate-100">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">Track your ticket</CardTitle>
              <CardDescription className="text-slate-300">
                For Servsys customers who want a quick status update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                Enter your ticket ID and we will email a verification code to the
                original requester address.
              </div>
              <Button
                asChild
                variant="secondary"
                className="w-full bg-cyan-500/90 text-slate-950 hover:bg-cyan-400"
              >
                <Link href="/track">
                  Track a ticket
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-slate-400">
                Invited staff? Use Microsoft login above.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="mt-12 flex flex-col items-start gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; {new Date().getFullYear()} ServDesk. All rights reserved.</span>
        <span>Need access? Contact your Servsys administrator.</span>
      </footer>
    </>
  );
}

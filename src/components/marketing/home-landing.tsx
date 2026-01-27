import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineTrackForm } from "@/components/marketing/inline-track-form";
import { StaffLoginButton } from "@/components/marketing/staff-login-button";
import {
  Search,
  ShieldCheck,
  TicketCheck,
  Wifi,
} from "lucide-react";

export function HomeLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-10 pt-8 lg:pt-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Logos/ServDesk_V1.2.svg"
              alt="ServDesk Logo"
              className="h-11 w-11 object-contain"
            />
            <div>
              <p className="text-base font-semibold leading-tight">
                ServDesk
              </p>
              <p className="text-xs text-slate-500">
                Customer support portal
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-600">
            <a className="rounded-full px-3 py-2 hover:bg-slate-100" href="#">
              Knowledge Base
            </a>
            <a
              className="rounded-full px-3 py-2 hover:bg-slate-100"
              href="/api/health"
            >
              Service Status
            </a>
            <a className="rounded-full px-3 py-2 hover:bg-slate-100" href="#">
              Contact Security
            </a>
          </nav>

          <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
            <a href="mailto:support@servsys.com?subject=Support%20Request">
              Submit a Request
            </a>
          </Button>
        </header>

        <main className="mt-14 grid flex-1 gap-14 lg:grid-cols-2 lg:items-center">
          <section className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                How can we help you{" "}
                <span className="text-blue-600">today?</span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Search our documentation, or securely track your existing support
                tickets. Servsys is committed to resolving technical queries with
                clarity and speed.
              </p>
            </div>

            <div className="relative max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-14 rounded-2xl border-slate-200 bg-white pl-12 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600"
                placeholder="Search for solutions..."
                aria-label="Search for solutions"
              />
            </div>

            <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TicketCheck className="h-4 w-4 text-blue-600" />
                Track your ticket
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Enter your ticket ID to get a verification code by email and view
                the latest status.
              </p>
              <div className="mt-4">
                <InlineTrackForm />
              </div>
            </div>
          </section>

          <section className="flex w-full justify-center lg:justify-end">
            <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Agent login
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Internal access for Servsys technical staff only.
                  </p>
                </div>
                <div className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 sm:flex">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure staff portal
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <StaffLoginButton />

                <p className="text-center text-xs leading-5 text-slate-500">
                  By logging in, you agree to the Servsys internal security policy.
                  Sessions may be monitored for compliance.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium text-slate-600">v4.2.0 Stable</div>
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Wifi className="h-3.5 w-3.5" />
                  Systems online
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-12 flex flex-col items-start gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} ServDesk Solutions. All rights reserved.</p>
          <p>Built for high-performance support teams.</p>
        </footer>
      </div>
    </div>
  );
}


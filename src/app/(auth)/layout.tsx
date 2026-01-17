/**
 * Auth Layout
 *
 * Provides a centered card layout for authentication pages.
 * Used by /login and /login/mfa pages.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - ServDesk",
  description: "Sign in to your ServDesk account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">ServDesk</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered service desk
        </p>
      </div>

      {/* Auth content */}
      <div className="w-full max-w-sm">{children}</div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ServDesk. All rights reserved.</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithMicrosoft } from "@/lib/auth-client";
import { ArrowRight } from "lucide-react";

export function StaffLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithMicrosoft("/dashboard", "/unauthorized");
    } catch (err) {
      console.error("Microsoft sign-in failed:", err);
      setError("Could not connect to Microsoft. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleSignIn}
        disabled={isLoading}
        className="h-14 w-full rounded-2xl border-slate-200 bg-white text-base font-semibold text-slate-900 hover:bg-slate-50"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
        {isLoading ? "Connecting..." : "Sign in with Microsoft 365"}
        <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
      </Button>
      {error ? (
        <p className="text-center text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}


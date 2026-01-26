"use client";

/**
 * Login Form Component
 *
 * Provides Microsoft OAuth authentication with:
 * - Single sign-on via Microsoft/Azure AD
 * - Loading state during redirect
 * - Error message display
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithMicrosoft } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const redirectTo = searchParams.get("redirect") || "/dashboard";
      await signInWithMicrosoft(redirectTo, "/unauthorized");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to connect to Microsoft. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Microsoft Sign In Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleMicrosoftLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-5 w-5"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Use your organization Microsoft account to sign in
      </p>
    </div>
  );
}

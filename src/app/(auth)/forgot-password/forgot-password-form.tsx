"use client";

/**
 * Forgot Password Form Component
 *
 * Client-side multi-step form for self-service password reset.
 * Flow:
 * 1. Step 1: User enters email, clicks "Send code"
 * 2. Step 2: User enters verification code + new password
 * 3. Success: Shows success message with link to login
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Mail, RefreshCw, ArrowLeft } from "lucide-react";

/** Cooldown time between code resend requests (in seconds) */
const RESEND_COOLDOWN_SECONDS = 60;

/** Step 1: Email input schema */
const emailStepSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

/** Step 2: Verification code + new password schema */
const resetStepSchema = z.object({
  verificationCode: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type EmailStepData = z.infer<typeof emailStepSchema>;
type ResetStepData = z.infer<typeof resetStepSchema>;

type FormStep = "email" | "verification" | "success";

/** API response type */
interface ApiResponse {
  message?: string;
  error?: string;
}

export function ForgotPasswordForm() {
  const router = useRouter();

  // Form step state
  const [step, setStep] = useState<FormStep>("email");
  const [email, setEmail] = useState("");

  // Email step state
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [sendCodeError, setSendCodeError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset step state
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Email form
  const emailForm = useForm<EmailStepData>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: {
      email: "",
    },
  });

  // Reset form
  const resetForm = useForm<ResetStepData>({
    resolver: zodResolver(resetStepSchema),
    defaultValues: {
      verificationCode: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Send verification code
  const handleSendCode = useCallback(async (data: EmailStepData) => {
    setSendCodeError(null);
    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setSendCodeError(result.error || "Failed to send verification code");
        return;
      }

      // Store email and move to verification step
      setEmail(data.email);
      setStep("verification");

      // Start cooldown timer
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      // Focus on verification code input
      setTimeout(() => resetForm.setFocus("verificationCode"), 100);
    } catch (err) {
      console.error("Error sending verification code:", err);
      setSendCodeError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSendingCode(false);
    }
  }, [resetForm]);

  // Resend verification code
  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0 || !email) return;

    setSendCodeError(null);
    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setSendCodeError(result.error || "Failed to resend verification code");
        return;
      }

      // Start cooldown timer
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Error resending verification code:", err);
      setSendCodeError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSendingCode(false);
    }
  }, [email, resendCooldown]);

  // Reset password
  const handleResetPassword = useCallback(async (data: ResetStepData) => {
    setResetError(null);
    setIsResetting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          verificationCode: data.verificationCode,
          newPassword: data.newPassword,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setResetError(result.error || "Failed to reset password");
        return;
      }

      // Success!
      setStep("success");

      // Redirect to login after short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error("Error resetting password:", err);
      setResetError("An unexpected error occurred. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }, [email, router]);

  // Go back to email step
  const handleBackToEmail = useCallback(() => {
    setStep("email");
    setEmail("");
    setSendCodeError(null);
    setResetError(null);
    resetForm.reset();
  }, [resetForm]);

  // Step 1: Email input
  if (step === "email") {
    return (
      <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4">
        {/* Error message */}
        {sendCodeError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sendCodeError}</AlertDescription>
          </Alert>
        )}

        {/* Email field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isSendingCode}
            {...emailForm.register("email")}
          />
          {emailForm.formState.errors.email && (
            <p className="text-sm text-destructive">
              {emailForm.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSendingCode}>
          {isSendingCode ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send verification code
            </>
          )}
        </Button>

        {/* Back to login link */}
        <div className="text-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </form>
    );
  }

  // Step 2: Verification code + new password
  if (step === "verification") {
    return (
      <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
        {/* Email indicator */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{email}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={handleBackToEmail}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Change
          </Button>
        </div>

        {/* Error messages */}
        {(sendCodeError || resetError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sendCodeError || resetError}</AlertDescription>
          </Alert>
        )}

        {/* Verification code field */}
        <div className="space-y-2">
          <Label htmlFor="verificationCode">Verification Code</Label>
          <Input
            id="verificationCode"
            placeholder="000000"
            maxLength={6}
            className="font-mono text-center text-lg tracking-widest"
            disabled={isResetting}
            {...resetForm.register("verificationCode")}
          />
          {resetForm.formState.errors.verificationCode && (
            <p className="text-sm text-destructive">
              {resetForm.formState.errors.verificationCode.message}
            </p>
          )}
          {/* Resend code button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={isSendingCode || resendCooldown > 0}
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
            >
              {isSendingCode ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"
              }
            </Button>
          </div>
        </div>

        {/* New password field */}
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Min. 8 characters"
            disabled={isResetting}
            {...resetForm.register("newPassword")}
          />
          {resetForm.formState.errors.newPassword && (
            <p className="text-sm text-destructive">
              {resetForm.formState.errors.newPassword.message}
            </p>
          )}
        </div>

        {/* Confirm password field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            disabled={isResetting}
            {...resetForm.register("confirmPassword")}
          />
          {resetForm.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {resetForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isResetting}>
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    );
  }

  // Step 3: Success
  return (
    <div className="space-y-4">
      <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Your password has been reset successfully. Redirecting to login...
        </AlertDescription>
      </Alert>

      <div className="text-center">
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Go to login
          </Button>
        </Link>
      </div>
    </div>
  );
}

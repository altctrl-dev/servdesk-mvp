"use client";

/**
 * Accept Invitation Form Component
 *
 * Client-side form for accepting a user invitation with email verification.
 * Flow:
 * 1. User sees invitation details + "Send verification code" button
 * 2. User enters code received via email
 * 3. After verification, user is redirected to Microsoft sign-in
 * 4. Microsoft login creates account with pre-assigned role
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertCircle, CheckCircle, Mail, Shield, KeyRound, RefreshCw } from "lucide-react";
import { signInWithMicrosoft } from "@/lib/auth-client";

/** Role display names */
const roleDisplayNames: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  AGENT: "Agent",
  VIEW_ONLY: "View Only",
};

/** Cooldown time between code resend requests (in seconds) */
const RESEND_COOLDOWN_SECONDS = 60;

/** Validation schema for verification code */
const verificationSchema = z.object({
  verificationCode: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

interface InvitationDetails {
  email: string;
  role: string;
  expiresAt: string;
}

interface SendCodeResponse {
  error?: string;
  message?: string;
  codesSent?: number;
  maxCodes?: number;
}

interface ApiResponse {
  error?: string;
  message?: string;
  invitation?: InvitationDetails;
}

interface AcceptInvitationFormProps {
  token: string;
}

type FormStep = "initial" | "verification" | "success";

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const router = useRouter();

  // Invitation state
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Form step state
  const [step, setStep] = useState<FormStep>("initial");

  // Send code state
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [sendCodeError, setSendCodeError] = useState<string | null>(null);
  const [codesSent, setCodesSent] = useState(0);
  const [maxCodes, setMaxCodes] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  // Fetch invitation details on mount
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const result: ApiResponse = await response.json();

        if (!response.ok) {
          setInvitationError(result.error || "Invalid invitation");
          return;
        }

        setInvitation(result.invitation!);
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setInvitationError("Failed to load invitation details");
      } finally {
        setIsLoadingInvitation(false);
      }
    }

    fetchInvitation();
  }, [token]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Send verification code
  const handleSendCode = useCallback(async () => {
    setSendCodeError(null);
    setIsSendingCode(true);

    try {
      const response = await fetch(`/api/invitations/${token}/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result: SendCodeResponse = await response.json();

      if (!response.ok) {
        setSendCodeError(result.error || "Failed to send verification code");
        return;
      }

      // Update codes sent count
      if (result.codesSent !== undefined) {
        setCodesSent(result.codesSent);
      }
      if (result.maxCodes !== undefined) {
        setMaxCodes(result.maxCodes);
      }

      // Move to verification step
      setStep("verification");

      // Start cooldown timer
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      // Focus on verification code input
      setTimeout(() => setFocus("verificationCode"), 100);
    } catch (err) {
      console.error("Error sending verification code:", err);
      setSendCodeError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSendingCode(false);
    }
  }, [token, setFocus]);

  // Verify code and redirect to Microsoft sign-in
  const onSubmit = async (data: VerificationFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Verify the code
      const response = await fetch(`/api/invitations/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationCode: data.verificationCode,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setSubmitError(result.error || "Invalid verification code");
        setIsSubmitting(false);
        return;
      }

      // Success - show success message then redirect to Microsoft sign-in
      setStep("success");

      // Redirect to Microsoft sign-in after short delay
      setTimeout(async () => {
        try {
          await signInWithMicrosoft("/dashboard");
        } catch (err) {
          console.error("Error redirecting to Microsoft:", err);
          // Fallback - redirect to login page
          router.push("/login");
        }
      }, 1500);
    } catch (err) {
      console.error("Error verifying code:", err);
      setSubmitError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoadingInvitation) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Invitation error state
  if (invitationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Invitation Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{invitationError}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state - redirecting to Microsoft
  if (step === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Email Verified
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Redirecting to Microsoft sign-in to complete your account setup...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Initial - Show invitation details and send code button
  if (step === "initial") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Verify your email to join ServDesk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invitation details */}
          <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invitation?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>Role:</span>
              <Badge variant="secondary">
                {roleDisplayNames[invitation?.role || ""] || invitation?.role}
              </Badge>
            </div>
          </div>

          {/* Info text */}
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;ll send a 6-digit verification code to <strong>{invitation?.email}</strong>.
            After verifying, you&apos;ll sign in with your Microsoft account.
          </p>

          {/* Error display */}
          {sendCodeError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sendCodeError}</AlertDescription>
            </Alert>
          )}

          {/* Send code button */}
          <Button
            onClick={handleSendCode}
            className="w-full"
            disabled={isSendingCode}
          >
            {isSendingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Code...
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Send Verification Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Verification - Code input
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Verification Code</CardTitle>
        <CardDescription>
          Enter the code sent to {invitation?.email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Invitation details (compact) */}
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{invitation?.email}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {roleDisplayNames[invitation?.role || ""] || invitation?.role}
          </Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error display */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
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
              disabled={isSubmitting}
              {...register("verificationCode")}
            />
            {errors.verificationCode && (
              <p className="text-sm text-destructive">{errors.verificationCode.message}</p>
            )}
            {/* Resend code button */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {codesSent > 0 && `${codesSent}/${maxCodes} codes sent`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSendCode}
                disabled={isSendingCode || resendCooldown > 0 || codesSent >= maxCodes}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                {isSendingCode ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : codesSent >= maxCodes
                    ? "Max codes sent"
                    : "Resend code"
                }
              </Button>
            </div>
          </div>

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Verify & Continue with Microsoft
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

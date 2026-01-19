"use client";

/**
 * Accept Invitation Form Component
 *
 * Client-side form for accepting a user invitation with email verification.
 * Flow:
 * 1. User sees invitation details + "Send verification code" button
 * 2. User receives code via email, enters it with name/password
 * 3. Account is created after successful verification
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

/** Role display names */
const roleDisplayNames: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  VIEW_ONLY: "View Only",
};

/** Cooldown time between code resend requests (in seconds) */
const RESEND_COOLDOWN_SECONDS = 60;

/** Validation schema for accept invitation form (Step 2) */
const acceptInvitationFormSchema = z.object({
  verificationCode: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AcceptInvitationFormData = z.infer<typeof acceptInvitationFormSchema>;

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
  user?: { id: string; email: string; name: string; role: string };
}

interface AcceptInvitationFormProps {
  token: string;
}

type FormStep = "initial" | "verification";

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
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: {
      verificationCode: "",
      name: "",
      password: "",
      confirmPassword: "",
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

  // Submit form to create account
  const onSubmit = async (data: AcceptInvitationFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationCode: data.verificationCode,
          name: data.name,
          password: data.password,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setSubmitError(result.error || "Failed to create account");
        return;
      }

      // Success
      setSuccess(true);

      // Redirect to login after short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
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

  // Success state
  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Account Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your account has been created successfully. Redirecting to login...
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
            Verify your email to complete account setup
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
            To verify that you own this email address, we will send a 6-digit verification code to <strong>{invitation?.email}</strong>.
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

  // Step 2: Verification - Code input + account details form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Account</CardTitle>
        <CardDescription>
          Enter the verification code sent to {invitation?.email}
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
            <div className="flex gap-2">
              <Input
                id="verificationCode"
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest"
                disabled={isSubmitting}
                {...register("verificationCode")}
              />
            </div>
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

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              disabled={isSubmitting}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              disabled={isSubmitting}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

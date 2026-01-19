"use client";

/**
 * Accept Invitation Form Component
 *
 * Client-side form for accepting a user invitation.
 * Validates the token, displays invitation details, and handles account creation.
 */

import { useState, useEffect } from "react";
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
import { Loader2, AlertCircle, CheckCircle, Mail, Shield } from "lucide-react";

/** Role display names */
const roleDisplayNames: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  VIEW_ONLY: "View Only",
};

/** Validation schema for accept invitation form */
const acceptInvitationFormSchema = z.object({
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

interface ApiResponse {
  error?: string;
  message?: string;
  invitation?: InvitationDetails;
  user?: { id: string; email: string; name: string; role: string };
}

interface AcceptInvitationFormProps {
  token: string;
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: {
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

  const onSubmit = async (data: AcceptInvitationFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  // Main form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept Invitation</CardTitle>
        <CardDescription>
          Complete your account setup to join ServDesk
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error display */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

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

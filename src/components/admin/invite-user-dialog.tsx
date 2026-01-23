"use client";

/**
 * Invite User Dialog Component
 *
 * Dialog form for inviting new users via email.
 * Used by SUPER_ADMIN to send invitations to the system.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoleSelect } from "./role-select";
import { Mail, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import type { UserRole } from "@/db/schema";

/** Validation schema for invite user form */
const inviteUserFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "AGENT"]),
});

type InviteUserFormData = z.infer<typeof inviteUserFormSchema>;

interface ApiResponse {
  error?: string;
  message?: string;
  emailSent?: boolean;
  invitation?: { id: string; email: string; role: string; expiresAt: string };
}

interface InviteUserDialogProps {
  onSuccess?: () => void;
}

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: "",
      role: "AGENT",
    },
  });

  const currentRole = watch("role");

  const onSubmit = async (data: InviteUserFormData) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to send invitation");
        return;
      }

      // Success
      const successMessage = result.emailSent
        ? `Invitation sent to ${data.email}`
        : `Invitation created for ${data.email} (email not sent - check Resend configuration)`;
      setSuccess(successMessage);

      // Reset form and close after short delay
      setTimeout(() => {
        reset();
        setSuccess(null);
        setOpen(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Mail className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new user to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success display */}
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                disabled={isLoading || !!success}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Role select */}
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <RoleSelect
                value={currentRole as UserRole}
                onValueChange={(value) => setValue("role", value)}
                disabled={isLoading || !!success}
                className="w-full"
              />
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                The user will have this role when they accept the invitation.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !!success}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

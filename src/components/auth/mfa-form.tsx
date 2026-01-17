"use client";

/**
 * MFA Form Component
 *
 * Provides TOTP verification form with:
 * - 6-digit code input
 * - Form validation
 * - Loading state during verification
 * - Error message display
 * - Backup code link option
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyTOTP } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Validation schema for MFA form */
const mfaSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d+$/, "Code must contain only numbers"),
});

type MfaFormData = z.infer<typeof mfaSchema>;

export function MfaForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: "",
    },
  });

  const codeValue = watch("code");

  const onSubmit = useCallback(async (data: MfaFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await verifyTOTP(data.code);

      if (result.error) {
        setError(result.error.message || "Invalid verification code");
        setValue("code", ""); // Clear the code for retry
        inputRef.current?.focus();
        return;
      }

      // Success - redirect to admin
      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error("MFA verification error:", err);
      setError("An unexpected error occurred. Please try again.");
      setValue("code", "");
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [router, setValue]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (codeValue.length === 6 && /^\d{6}$/.test(codeValue)) {
      handleSubmit(onSubmit)();
    }
  }, [codeValue, handleSubmit, onSubmit]);

  // Handle paste - extract numbers only
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const numbers = pastedText.replace(/\D/g, "").slice(0, 6);
    setValue("code", numbers);
  };

  // Handle input - numbers only
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setValue("code", value);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Code input */}
      <div className="space-y-2">
        <Label htmlFor="code">Verification Code</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          autoComplete="one-time-code"
          disabled={isLoading}
          className="text-center text-2xl tracking-widest font-mono"
          {...register("code")}
          ref={(e) => {
            register("code").ref(e);
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
          }}
          onChange={handleInput}
          onPaste={handlePaste}
        />
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
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
            Verifying...
          </>
        ) : (
          "Verify"
        )}
      </Button>

      {/* Backup code link */}
      <div className="text-center">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          onClick={() => {
            // TODO: Implement backup code flow
            alert("Backup code recovery is not yet implemented");
          }}
        >
          Use a backup code instead
        </button>
      </div>

      {/* Back to login */}
      <div className="text-center">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          onClick={() => router.push("/login")}
        >
          Back to login
        </button>
      </div>
    </form>
  );
}

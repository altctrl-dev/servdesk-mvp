"use client";

/**
 * Loading State Component
 *
 * Reusable component for displaying loading states with spinner.
 */

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  fullPage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  default: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({
  message = "Loading...",
  className,
  size = "default",
  fullPage = false,
}: LoadingStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage && "min-h-[50vh]",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline Spinner Component
 *
 * Smaller spinner for inline use (e.g., in buttons).
 */
interface SpinnerProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function Spinner({ className, size = "sm" }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
    />
  );
}

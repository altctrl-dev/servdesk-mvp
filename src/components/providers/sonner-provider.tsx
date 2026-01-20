"use client";

/**
 * Sonner Toast Provider
 *
 * Enhanced toast notifications with better styling and animations.
 */

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function SonnerProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme as "light" | "dark" | "system"}
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast bg-background text-foreground border-border shadow-lg",
          title: "text-foreground font-medium",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton: "bg-background border-border",
        },
      }}
      closeButton
      richColors
    />
  );
}

"use client";

/**
 * Theme Toggle
 *
 * Button to toggle between light and dark themes with smooth transitions.
 * Uses mounted state to prevent hydration mismatch.
 */

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ThemeToggle({
  variant = "ghost",
  size = "icon",
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Wait for client-side mount before rendering theme-dependent UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";

    // Add transitioning class to enable smooth color transitions
    document.documentElement.classList.add("transitioning");

    // Change the theme (saves to localStorage via next-themes)
    setTheme(newTheme);

    // Remove the transitioning class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove("transitioning");
    }, 100);
  }, [resolvedTheme, setTheme]);

  // Show placeholder during SSR/hydration to prevent mismatch
  if (!mounted) {
    return (
      <Button variant={variant} size={size} className="relative">
        <span className="h-5 w-5" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleThemeChange}
      className="relative"
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

"use client";

/**
 * Theme Toggle
 *
 * Button to toggle between light and dark themes with smooth transitions.
 * Saves theme to cookie for SSR support (prevents FOUC).
 */

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Save theme to cookie for server-side access.
 * Cookie expires in 1 year and is accessible from all paths.
 */
function setThemeCookie(theme: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `theme=${theme};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function ThemeToggle({
  variant = "ghost",
  size = "icon",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";

    // Add transitioning class to enable smooth color transitions
    document.documentElement.classList.add("transitioning");

    // Save to cookie for SSR
    setThemeCookie(newTheme);

    // Change the theme (also saves to localStorage via next-themes)
    setTheme(newTheme);

    // Remove the transitioning class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove("transitioning");
    }, 100);
  }, [theme, setTheme]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleThemeChange}
      className="relative"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

"use client";

/**
 * Theme Toggle
 *
 * Button to toggle between light and dark themes with smooth transitions.
 */

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ThemeToggle({
  variant = "ghost",
  size = "icon",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = useCallback(() => {
    // Add transitioning class to enable smooth color transitions
    document.documentElement.classList.add("transitioning");

    // Change the theme
    setTheme(theme === "dark" ? "light" : "dark");

    // Remove the transitioning class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove("transitioning");
    }, 350);
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

"use client";

/**
 * Theme Provider
 *
 * Wraps the application with next-themes provider for dark/light mode support.
 * When a defaultTheme is passed from server (via cookie), we disable system
 * preference detection to prevent FOUC from theme re-evaluation.
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({
  children,
  defaultTheme,
  ...props
}: ThemeProviderProps) {
  // If server provided a specific theme (from cookie), don't let next-themes
  // re-evaluate system preference - it would cause a flash
  const hasServerTheme = defaultTheme === "dark" || defaultTheme === "light";

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme || "system"}
      enableSystem={!hasServerTheme}
      enableColorScheme
      disableTransitionOnChange
      storageKey="theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

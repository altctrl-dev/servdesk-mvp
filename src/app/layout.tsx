import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SonnerProvider } from "@/components/providers/sonner-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ServDesk MVP",
  description: "AI-powered service desk for small businesses",
  icons: {
    icon: "/Logos/ServDesk_V1.3.png",
    shortcut: "/Logos/ServDesk_V1.3.png",
    apple: "/Logos/ServDesk_V1.3.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read theme from cookie for SSR (prevents FOUC)
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme");
  const theme = themeCookie?.value as "dark" | "light" | undefined;

  // Determine if dark mode should be applied server-side
  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={isDark ? "dark" : ""}
      style={isDark ? { colorScheme: "dark" } : undefined}
    >
      <head>
        {/*
          Critical: This script runs before React hydration.
          1. If no cookie but localStorage has theme → apply it AND set cookie for next SSR
          2. If no cookie and no localStorage → check system preference
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var d = document.documentElement;
                var hasCookie = document.cookie.indexOf('theme=') !== -1;

                // If server already set dark class via cookie, we're done
                if (d.classList.contains('dark') && hasCookie) return;

                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || (stored !== 'light' && prefersDark);

                  // Apply theme
                  if (isDark) {
                    d.classList.add('dark');
                    d.style.colorScheme = 'dark';
                  } else {
                    d.classList.remove('dark');
                    d.style.colorScheme = 'light';
                  }

                  // Sync to cookie if not already set (for next SSR)
                  if (!hasCookie && stored) {
                    document.cookie = 'theme=' + stored + ';path=/;max-age=31536000;SameSite=Lax';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme={theme || "system"}>
          {children}
          <SonnerProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}

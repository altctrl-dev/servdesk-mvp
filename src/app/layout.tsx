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
  const theme = themeCookie?.value;

  // Determine if dark mode should be applied server-side
  // If cookie is "dark", apply dark. If "light", don't. If not set, leave it to client.
  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={isDark ? "dark" : ""}
      style={isDark ? { colorScheme: "dark" } : undefined}
    >
      <head>
        {/* Fallback for first-time visitors (no cookie yet) - check localStorage */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var d = document.documentElement;
                if (d.classList.contains('dark')) return; // Already set by server
                try {
                  var theme = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (theme !== 'light' && prefersDark);
                  if (isDark) {
                    d.classList.add('dark');
                    d.style.colorScheme = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <SonnerProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}

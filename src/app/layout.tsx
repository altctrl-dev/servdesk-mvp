import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          FOUC Prevention Script - runs before any rendering
          Reads localStorage and applies theme class immediately.
          Defaults to light mode if no preference is saved.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
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

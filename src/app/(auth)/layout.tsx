/**
 * Auth Layout
 *
 * Keep auth pages on the same layout as the public landing.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - ServDesk",
  description: "Servsys customer support portal",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

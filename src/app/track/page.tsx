/**
 * Public Ticket Tracking Page
 *
 * Allows customers to track their ticket status without authentication.
 * Supports two methods:
 * - Ticket number + email
 * - Direct tracking token from email link
 */

import { Suspense } from "react";
import Link from "next/link";
import { TrackingForm } from "@/components/track/tracking-form";
import { Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const runtime = 'edge';

interface TrackPageProps {
  searchParams: Promise<{ token?: string }>;
}

function TrackingFormSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export default async function TrackPage({ searchParams }: TrackPageProps) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Ticket className="h-5 w-5" />
            <span>ServDesk</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={<TrackingFormSkeleton />}>
            <TrackingForm initialToken={token} />
          </Suspense>
        </div>

        {/* Help text */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Need help? Contact us at</p>
          <a
            href="mailto:support@servdesk.com"
            className="font-medium text-primary hover:underline"
          >
            support@servdesk.com
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto flex h-14 items-center justify-center px-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ServDesk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

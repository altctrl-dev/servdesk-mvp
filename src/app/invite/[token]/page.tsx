/**
 * Accept Invitation Page
 *
 * Public page for accepting user invitations.
 * Shows invitation details and form for setting up account.
 */

export const runtime = 'edge';

import { AcceptInvitationForm } from "./accept-invitation-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitationPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">ServDesk</h1>
          <p className="text-muted-foreground mt-2">
            Accept your invitation to join
          </p>
        </div>

        <AcceptInvitationForm token={token} />
      </div>
    </div>
  );
}

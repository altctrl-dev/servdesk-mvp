"use client";

/**
 * Ticket Page Header Component
 *
 * Client component for the tickets page header that includes
 * the "New Ticket" button with dialog functionality.
 */

import { useRouter } from "next/navigation";
import { CreateTicketDialog } from "./create-ticket-dialog";

interface TicketPageHeaderProps {
  /** Whether the user can create tickets (SUPER_ADMIN only) */
  canCreateTicket?: boolean;
}

export function TicketPageHeader({ canCreateTicket = false }: TicketPageHeaderProps) {
  const router = useRouter();

  const handleTicketCreated = () => {
    // Refresh the page to show the new ticket
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="text-muted-foreground">
          Manage and respond to support tickets
        </p>
      </div>
      {canCreateTicket && (
        <CreateTicketDialog onSuccess={handleTicketCreated} />
      )}
    </div>
  );
}

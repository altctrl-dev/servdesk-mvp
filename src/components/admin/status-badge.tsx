/**
 * Status Badge Component
 *
 * Displays ticket status with appropriate colors.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/db/schema";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const statusConfig: Record<
  TicketStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  NEW: { label: "New", variant: "default" },
  OPEN: { label: "Open", variant: "secondary" },
  PENDING_CUSTOMER: { label: "Pending", variant: "outline" },
  ON_HOLD: { label: "On Hold", variant: "outline" },
  RESOLVED: { label: "Resolved", variant: "secondary" },
  CLOSED: { label: "Closed", variant: "outline" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "default" };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        // Custom colors based on status
        status === "NEW" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        status === "OPEN" && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
        status === "PENDING_CUSTOMER" && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
        status === "ON_HOLD" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
        status === "RESOLVED" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
        status === "CLOSED" && "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

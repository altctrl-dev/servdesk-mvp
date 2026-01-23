"use client";

/**
 * Status Badge Component
 *
 * Reusable badge for displaying ticket status with semantic colors.
 * Uses design tokens for consistent theming.
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/db/schema";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        OPEN: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        PENDING_CUSTOMER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        ON_HOLD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        default: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      status: "NEW",
      size: "default",
    },
  }
);

// Status labels for display
const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING_CUSTOMER: "Pending",
  ON_HOLD: "On Hold",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

interface StatusBadgeProps extends Omit<VariantProps<typeof statusBadgeVariants>, "status"> {
  status: TicketStatus;
  className?: string;
  showLabel?: boolean;
}

export function StatusBadge({
  status,
  size,
  className,
  showLabel = true,
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status, size }), className)}>
      {showLabel ? STATUS_LABELS[status] : status}
    </span>
  );
}

// Export for type safety
export type { StatusBadgeProps };
export { statusBadgeVariants, STATUS_LABELS };

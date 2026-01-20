"use client";

/**
 * Priority Badge Component
 *
 * Reusable badge for displaying ticket priority with semantic colors.
 * Uses design tokens for consistent theming.
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUp,
  Minus,
  type LucideIcon,
} from "lucide-react";
import type { TicketPriority } from "@/db/schema";

const priorityBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      priority: {
        URGENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        NORMAL: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        default: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      priority: "NORMAL",
      size: "default",
    },
  }
);

// Priority configuration
const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; icon: LucideIcon }
> = {
  URGENT: { label: "Urgent", icon: AlertTriangle },
  HIGH: { label: "High", icon: ArrowUp },
  NORMAL: { label: "Normal", icon: Minus },
};

interface PriorityBadgeProps
  extends Omit<VariantProps<typeof priorityBadgeVariants>, "priority"> {
  priority: TicketPriority;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  size,
  className,
  showIcon = true,
  showLabel = true,
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <span className={cn(priorityBadgeVariants({ priority, size }), className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {showLabel && config.label}
    </span>
  );
}

// Export for type safety
export type { PriorityBadgeProps };
export { priorityBadgeVariants, PRIORITY_CONFIG };

/**
 * Priority Badge Component
 *
 * Displays ticket priority with appropriate colors.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Minus } from "lucide-react";
import type { TicketPriority } from "@/db/schema";

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
  showIcon?: boolean;
}

const priorityConfig: Record<
  TicketPriority,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  NORMAL: { label: "Normal", icon: Minus },
  HIGH: { label: "High", icon: AlertCircle },
  URGENT: { label: "Urgent", icon: AlertTriangle },
};

export function PriorityBadge({
  priority,
  className,
  showIcon = true,
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] || { label: priority, icon: Minus };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        priority === "NORMAL" && "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
        priority === "HIGH" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
        priority === "URGENT" && "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

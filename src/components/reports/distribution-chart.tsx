/**
 * Distribution Chart Component
 *
 * Horizontal bar chart showing distribution of values
 * with labels, counts, and percentages.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

export interface DistributionChartProps {
  data: DistributionItem[];
  total?: number;
  title?: string;
  className?: string;
}

/**
 * Default colors for distribution items (mapped to design tokens)
 */
const DEFAULT_COLORS = [
  "bg-[hsl(var(--primary))]",
  "bg-[hsl(var(--success))]",
  "bg-[hsl(var(--warning))]",
  "bg-[hsl(var(--destructive))]",
  "bg-[hsl(var(--info))]",
  "bg-muted-foreground",
];

/**
 * Status-specific color mapping (for ticket statuses)
 */
const STATUS_COLORS: Record<string, string> = {
  new: "bg-[hsl(var(--status-new))]",
  open: "bg-[hsl(var(--status-open))]",
  "pending-customer": "bg-[hsl(var(--status-pending-customer))]",
  pending_customer: "bg-[hsl(var(--status-pending-customer))]",
  resolved: "bg-[hsl(var(--status-resolved))]",
  closed: "bg-[hsl(var(--status-closed))]",
};

/**
 * Priority-specific color mapping
 */
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-[hsl(var(--priority-urgent))]",
  high: "bg-[hsl(var(--priority-high))]",
  normal: "bg-[hsl(var(--priority-normal))]",
  low: "bg-muted-foreground",
};

function getColorForLabel(label: string, index: number, customColor?: string): string {
  if (customColor) {
    return customColor;
  }

  const normalizedLabel = label.toLowerCase().replace(/\s+/g, "-");

  // Check status colors
  if (STATUS_COLORS[normalizedLabel]) {
    return STATUS_COLORS[normalizedLabel];
  }

  // Check priority colors
  if (PRIORITY_COLORS[normalizedLabel]) {
    return PRIORITY_COLORS[normalizedLabel];
  }

  // Fall back to default colors
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export function DistributionChart({
  data,
  total: providedTotal,
  title,
  className,
}: DistributionChartProps) {
  // Sort by value descending
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value);
  }, [data]);

  // Calculate total
  const total = React.useMemo(() => {
    return providedTotal ?? sortedData.reduce((sum, item) => sum + item.value, 0);
  }, [providedTotal, sortedData]);

  // Find max for scaling
  const maxValue = React.useMemo(() => {
    return Math.max(...sortedData.map((item) => item.value), 1);
  }, [sortedData]);

  if (sortedData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border p-8",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      )}

      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const barWidth = (item.value / maxValue) * 100;
          const colorClass = getColorForLabel(item.label, index, item.color);

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">
                  {item.label.replace(/_/g, " ").replace(/-/g, " ")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {item.value}{" "}
                  <span className="text-xs">({percentage.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    colorClass
                  )}
                  style={{ width: `${barWidth}%` }}
                  role="progressbar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={maxValue}
                  aria-label={`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span className="font-bold tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  );
}

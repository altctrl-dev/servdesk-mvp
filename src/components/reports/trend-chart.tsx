"use client";

/**
 * Trend Chart Component
 *
 * CSS-based bar chart showing ticket trends over time
 * with created, resolved, and closed tickets per day.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TrendDataPoint {
  date: string;
  created: number;
  resolved: number;
  closed: number;
}

export interface TrendChartProps {
  data: TrendDataPoint[];
  height?: number;
  className?: string;
}

interface TooltipData {
  date: string;
  created: number;
  resolved: number;
  closed: number;
  x: number;
  y: number;
}

const LEGEND_ITEMS = [
  { key: "created", label: "Created", color: "bg-[hsl(var(--primary))]" },
  { key: "resolved", label: "Resolved", color: "bg-[hsl(var(--success))]" },
  { key: "closed", label: "Closed", color: "bg-muted-foreground" },
] as const;

/**
 * Format date string for display (e.g., "Jan 15")
 */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendChart({
  data,
  height = 200,
  className,
}: TrendChartProps) {
  const [tooltip, setTooltip] = React.useState<TooltipData | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Calculate max value for scaling
  const maxValue = React.useMemo(() => {
    return Math.max(
      ...data.flatMap((d) => [d.created, d.resolved, d.closed]),
      1 // Prevent division by zero
    );
  }, [data]);

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    point: TrendDataPoint
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const chartRect = chartRef.current?.getBoundingClientRect();
    if (chartRect) {
      setTooltip({
        ...point,
        x: rect.left - chartRect.left + rect.width / 2,
        y: rect.top - chartRect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border",
          className
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-sm", item.color)} />
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="relative rounded-md border bg-muted/20 p-4"
        style={{ height }}
      >
        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="font-medium">{formatDateLabel(tooltip.date)}</p>
            <div className="mt-1 space-y-0.5">
              <p>
                <span className="text-[hsl(var(--primary))]">Created:</span>{" "}
                {tooltip.created}
              </p>
              <p>
                <span className="text-[hsl(var(--success))]">Resolved:</span>{" "}
                {tooltip.resolved}
              </p>
              <p>
                <span className="text-muted-foreground">Closed:</span>{" "}
                {tooltip.closed}
              </p>
            </div>
          </div>
        )}

        {/* Bar groups */}
        <div className="flex h-full items-end gap-1">
          {data.map((point, index) => {
            const createdHeight = (point.created / maxValue) * 100;
            const resolvedHeight = (point.resolved / maxValue) * 100;
            const closedHeight = (point.closed / maxValue) * 100;

            return (
              <div
                key={point.date}
                className="group relative flex flex-1 items-end justify-center gap-0.5"
                onMouseEnter={(e) => handleMouseEnter(e, point)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Bars */}
                <div
                  className="w-2 rounded-t bg-[hsl(var(--primary))] transition-all duration-200 group-hover:opacity-80"
                  style={{ height: `${createdHeight}%` }}
                  role="img"
                  aria-label={`Created: ${point.created}`}
                />
                <div
                  className="w-2 rounded-t bg-[hsl(var(--success))] transition-all duration-200 group-hover:opacity-80"
                  style={{ height: `${resolvedHeight}%` }}
                  role="img"
                  aria-label={`Resolved: ${point.resolved}`}
                />
                <div
                  className="w-2 rounded-t bg-muted-foreground transition-all duration-200 group-hover:opacity-80"
                  style={{ height: `${closedHeight}%` }}
                  role="img"
                  aria-label={`Closed: ${point.closed}`}
                />

                {/* X-axis label (show every nth label to prevent overlap) */}
                {(index === 0 ||
                  index === data.length - 1 ||
                  index % Math.ceil(data.length / 7) === 0) && (
                  <span className="absolute -bottom-5 text-[10px] text-muted-foreground">
                    {formatDateLabel(point.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

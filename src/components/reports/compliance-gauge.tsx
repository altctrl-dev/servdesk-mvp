/**
 * Compliance Gauge Component
 *
 * Visual gauge showing SLA compliance percentage with
 * color-coded progress indicator and breakdown counts.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ComplianceGaugeProps {
  label: string;
  value: number; // percentage 0-100
  total: number;
  withinSLA: number;
  breached: number;
  variant?: "circular" | "horizontal";
  className?: string;
}

/**
 * Get color class based on compliance percentage
 * Green: >90%, Yellow: 70-90%, Red: <70%
 */
function getComplianceColor(value: number): {
  bg: string;
  text: string;
  track: string;
} {
  if (value >= 90) {
    return {
      bg: "bg-[hsl(var(--success))]",
      text: "text-[hsl(var(--success))]",
      track: "bg-[hsl(var(--success)/0.2)]",
    };
  }
  if (value >= 70) {
    return {
      bg: "bg-[hsl(var(--warning))]",
      text: "text-[hsl(var(--warning))]",
      track: "bg-[hsl(var(--warning)/0.2)]",
    };
  }
  return {
    bg: "bg-[hsl(var(--destructive))]",
    text: "text-[hsl(var(--destructive))]",
    track: "bg-[hsl(var(--destructive)/0.2)]",
  };
}

function CircularGauge({ value }: { value: number }) {
  const colors = getComplianceColor(value);
  // SVG circle parameters
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colors.track}
          stroke="currentColor"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={colors.bg}
          stroke="currentColor"
          style={{
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-2xl font-bold tabular-nums", colors.text)}>
          {Math.round(value)}%
        </span>
      </div>
    </div>
  );
}

function HorizontalGauge({ value }: { value: number }) {
  const colors = getComplianceColor(value);

  return (
    <div className="space-y-2">
      <div className={cn("h-3 w-full overflow-hidden rounded-full", colors.track)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors.bg)}
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-2xl font-bold tabular-nums", colors.text)}>
          {Math.round(value)}%
        </span>
      </div>
    </div>
  );
}

export function ComplianceGauge({
  label,
  value,
  total,
  withinSLA,
  breached,
  variant = "circular",
  className,
}: ComplianceGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("flex flex-col items-center text-center", className)}
      role="region"
      aria-label={`${label}: ${Math.round(clampedValue)}% compliance`}
    >
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {label}
      </h3>

      {variant === "circular" ? (
        <CircularGauge value={clampedValue} />
      ) : (
        <HorizontalGauge value={clampedValue} />
      )}

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-[hsl(var(--success))]">
            {withinSLA}
          </span>{" "}
          within SLA
        </p>
        <p>
          <span className="font-medium text-[hsl(var(--destructive))]">
            {breached}
          </span>{" "}
          breached
        </p>
        <p className="text-xs opacity-70">Total: {total}</p>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 *
 * Displays a single metric with optional trend indicator
 * and color-coded variant for visual feedback.
 */

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  default: "",
  success: "border-l-4 border-l-[hsl(var(--success))]",
  warning: "border-l-4 border-l-[hsl(var(--warning))]",
  danger: "border-l-4 border-l-[hsl(var(--destructive))]",
};

const trendColors = {
  up: "text-[hsl(var(--success))]",
  down: "text-[hsl(var(--destructive))]",
  neutral: "text-muted-foreground",
};

const TrendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

export function MetricCard({
  title,
  value,
  description,
  trend,
  trendValue,
  variant = "default",
  className,
}: MetricCardProps) {
  const Icon = trend ? TrendIcon[trend] : null;

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-3xl font-bold tabular-nums">
            {value}
          </CardTitle>
          {trend && trendValue && Icon && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trendColors[trend]
              )}
              aria-label={`Trend: ${trend} ${trendValue}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

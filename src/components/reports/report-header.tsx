"use client";

/**
 * Report Header Component
 *
 * Reusable header for report pages with title, description,
 * date range picker, and optional export functionality.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DateRangePicker,
  type DateRangePickerValue,
} from "./date-range-picker";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

export interface ReportHeaderProps {
  title: string;
  description: string;
  dateRange: DateRangePickerValue;
  onDateRangeChange: (value: DateRangePickerValue) => void;
  showExport?: boolean;
  onExport?: () => void;
  exportLoading?: boolean;
  className?: string;
}

export function ReportHeader({
  title,
  description,
  dateRange,
  onDateRangeChange,
  showExport = false,
  onExport,
  exportLoading = false,
  className,
}: ReportHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {showExport && onExport && (
          <Button
            variant="outline"
            onClick={onExport}
            disabled={exportLoading}
            className="shrink-0"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportLoading ? "Exporting..." : "Export"}
          </Button>
        )}
      </div>
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
    </header>
  );
}

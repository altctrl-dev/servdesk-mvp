"use client";

/**
 * Date Range Picker Component
 *
 * Allows users to select predefined date ranges (7d, 30d, 90d)
 * or specify custom date ranges for report filtering.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

export type DateRangePreset = "7d" | "30d" | "90d";

export interface DateRangeValue {
  from: Date;
  to: Date;
}

export interface PresetRangeValue {
  range: DateRangePreset;
}

export type DateRangePickerValue = DateRangeValue | PresetRangeValue;

export interface DateRangePickerProps {
  value: DateRangePickerValue;
  onChange: (value: DateRangePickerValue) => void;
  className?: string;
}

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
];

function isPresetRange(value: DateRangePickerValue): value is PresetRangeValue {
  return "range" in value;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const [customFrom, setCustomFrom] = React.useState<string>("");
  const [customTo, setCustomTo] = React.useState<string>("");

  // Initialize custom date inputs when value changes
  React.useEffect(() => {
    if (!isPresetRange(value)) {
      setCustomFrom(formatDateForInput(value.from));
      setCustomTo(formatDateForInput(value.to));
    }
  }, [value]);

  const handlePresetClick = (preset: DateRangePreset) => {
    setShowCustom(false);
    onChange({ range: preset });
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      if (from <= to) {
        onChange({ from, to });
      }
    }
  };

  const activePreset = isPresetRange(value) ? value.range : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.value}
            variant={activePreset === preset.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick(preset.value)}
            aria-pressed={activePreset === preset.value}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          variant={showCustom ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowCustom(!showCustom)}
          aria-expanded={showCustom}
          aria-controls="custom-date-range"
        >
          <Calendar className="mr-1 h-4 w-4" />
          Custom
          {showCustom ? (
            <ChevronUp className="ml-1 h-3 w-3" />
          ) : (
            <ChevronDown className="ml-1 h-3 w-3" />
          )}
        </Button>
      </div>

      {showCustom && (
        <div
          id="custom-date-range"
          className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/50 p-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="date-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input
              id="date-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="date-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input
              id="date-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-36"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}

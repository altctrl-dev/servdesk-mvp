"use client";

/**
 * Status Timeline Component
 *
 * Visual progress indicator showing ticket status progression.
 * Uses a horizontal timeline on desktop and vertical on mobile.
 */

import { Check, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/db/schema";

interface StatusStep {
  status: TicketStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_STEPS: StatusStep[] = [
  {
    status: "NEW",
    label: "Received",
    description: "Your ticket has been received",
    icon: Check,
  },
  {
    status: "OPEN",
    label: "In Progress",
    description: "An agent is working on your ticket",
    icon: Clock,
  },
  {
    status: "PENDING_CUSTOMER",
    label: "Awaiting Reply",
    description: "We're waiting for your response",
    icon: MessageSquare,
  },
  {
    status: "RESOLVED",
    label: "Resolved",
    description: "Your ticket has been resolved",
    icon: CheckCircle2,
  },
];

/** Map status to timeline progress (0-based index) */
function getStatusProgress(status: TicketStatus): number {
  switch (status) {
    case "NEW":
      return 0;
    case "OPEN":
      return 1;
    case "PENDING_CUSTOMER":
      return 2;
    case "RESOLVED":
    case "CLOSED":
      return 3;
    default:
      return 0;
  }
}

interface StatusTimelineProps {
  status: TicketStatus;
  className?: string;
}

export function StatusTimeline({ status, className }: StatusTimelineProps) {
  const currentProgress = getStatusProgress(status);
  const isClosed = status === "CLOSED";

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Timeline (horizontal) */}
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between">
          {/* Progress line background */}
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted" />

          {/* Progress line fill */}
          <div
            className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-500"
            style={{
              width: `${(currentProgress / (STATUS_STEPS.length - 1)) * 100}%`,
            }}
          />

          {/* Status steps */}
          {STATUS_STEPS.map((step, index) => {
            const isActive = index <= currentProgress;
            const isCurrent = index === currentProgress;

            return (
              <div key={step.status} className="relative flex flex-col items-center">
                {/* Icon circle */}
                <div
                  className={cn(
                    "z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background text-muted-foreground",
                    isCurrent && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <step.icon className="h-5 w-5" />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-2 text-sm font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>

                {/* Description (shown only for current) */}
                {isCurrent && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Timeline (vertical) */}
      <div className="block md:hidden">
        <div className="relative space-y-6 pl-8">
          {/* Progress line */}
          <div className="absolute left-3.5 top-0 h-full w-0.5 bg-muted" />
          <div
            className="absolute left-3.5 top-0 w-0.5 bg-primary transition-all duration-500"
            style={{
              height: `${(currentProgress / (STATUS_STEPS.length - 1)) * 100}%`,
            }}
          />

          {STATUS_STEPS.map((step, index) => {
            const isActive = index <= currentProgress;
            const isCurrent = index === currentProgress;

            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Icon circle */}
                <div
                  className={cn(
                    "absolute -left-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background text-muted-foreground",
                    isCurrent && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <step.icon className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closed status indicator */}
      {isClosed && (
        <div className="mt-4 rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          This ticket has been closed
        </div>
      )}
    </div>
  );
}

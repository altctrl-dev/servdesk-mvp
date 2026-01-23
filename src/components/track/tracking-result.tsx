"use client";

/**
 * Tracking Result Component
 *
 * Displays ticket information after successful tracking lookup.
 * Shows ticket number, subject, status, timeline, and last message preview.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTimeline } from "./status-timeline";
import { Calendar, Clock, MessageSquare } from "lucide-react";
import type { TicketStatus } from "@/db/schema";

/** Public ticket info returned from tracking API */
export interface TrackedTicket {
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: {
    type: "INBOUND" | "OUTBOUND";
    preview: string;
    createdAt: string;
  } | null;
}

interface TrackingResultProps {
  ticket: TrackedTicket;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    NEW: "New",
    OPEN: "In Progress",
    PENDING_CUSTOMER: "Awaiting Your Reply",
    ON_HOLD: "On Hold",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
  };
  return labels[status] || status;
}

function getStatusVariant(
  status: TicketStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "NEW":
      return "default";
    case "OPEN":
      return "secondary";
    case "PENDING_CUSTOMER":
      return "destructive";
    case "RESOLVED":
    case "CLOSED":
      return "outline";
    default:
      return "default";
  }
}

export function TrackingResult({ ticket }: TrackingResultProps) {
  return (
    <div className="space-y-6">
      {/* Ticket Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-mono text-muted-foreground">
                {ticket.ticketNumber}
              </p>
              <CardTitle className="text-lg sm:text-xl">
                {ticket.subject}
              </CardTitle>
            </div>
            <Badge variant={getStatusVariant(ticket.status)} className="w-fit">
              {getStatusLabel(ticket.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(ticket.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Updated {formatDate(ticket.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline status={ticket.status} />
        </CardContent>
      </Card>

      {/* Last Message Preview */}
      {ticket.lastMessage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Latest Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ticket.lastMessage.type === "INBOUND"
                  ? "You wrote"
                  : "Support replied"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(ticket.lastMessage.createdAt)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {ticket.lastMessage.preview}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        Need to reply? Check your email for the latest message from our support
        team and reply directly to that email.
      </p>
    </div>
  );
}

"use client";

/**
 * Agent Table Component
 *
 * Displays agent performance metrics in a sortable table format
 * with visual indicators for active/inactive status.
 */

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface AgentData {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  ticketsHandled: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  currentWorkload: number;
}

export interface AgentTableProps {
  agents: AgentData[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  className?: string;
}

type SortableColumn =
  | "name"
  | "ticketsHandled"
  | "avgResponseTime"
  | "avgResolutionTime"
  | "currentWorkload";

/**
 * Format minutes to human-readable time string (e.g., "2h 30m")
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

interface SortableHeaderProps {
  column: SortableColumn;
  label: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  className?: string;
}

function SortableHeader({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sortBy === column;

  const handleClick = () => {
    if (onSort) {
      onSort(column);
    }
  };

  const SortIcon = isActive
    ? sortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead className={cn("cursor-pointer select-none", className)}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 font-medium hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <SortIcon
          className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-40")}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}

export function AgentTable({
  agents,
  sortBy,
  sortOrder,
  onSort,
  className,
}: AgentTableProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No agents found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              column="name"
              label="Agent"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead>Status</TableHead>
            <SortableHeader
              column="ticketsHandled"
              label="Tickets"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              className="text-right"
            />
            <SortableHeader
              column="avgResponseTime"
              label="Avg Response"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              className="hidden text-right md:table-cell"
            />
            <SortableHeader
              column="avgResolutionTime"
              label="Avg Resolution"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              className="hidden text-right lg:table-cell"
            />
            <SortableHeader
              column="currentWorkload"
              label="Workload"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              className="text-right"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow
              key={agent.id}
              className={cn(!agent.isActive && "opacity-60")}
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {agent.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={agent.isActive ? "default" : "secondary"}>
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {agent.ticketsHandled}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {formatTime(agent.avgResponseTime)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">
                {formatTime(agent.avgResolutionTime)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {agent.currentWorkload}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

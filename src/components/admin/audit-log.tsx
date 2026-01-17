/**
 * Audit Log Component
 *
 * Displays the audit trail for a ticket.
 * Only visible to ADMIN and SUPER_ADMIN roles.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  History,
  ChevronDown,
  User,
  ArrowRight,
  Clock,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  createdAt: Date | string;
}

interface AuditLogProps {
  logs: AuditLogEntry[];
  defaultOpen?: boolean;
}

function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActionDescription(log: AuditLogEntry): string {
  switch (log.action) {
    case "created":
      return "Created ticket";
    case "status_change":
      return "Changed status";
    case "priority_change":
      return "Changed priority";
    case "assigned":
      return "Assigned ticket";
    case "unassigned":
      return "Unassigned ticket";
    case "reply":
      return "Added reply";
    case "internal_note":
      return "Added internal note";
    default:
      return log.action.replace(/_/g, " ");
  }
}

function AuditLogItem({ log }: { log: AuditLogEntry }) {
  const hasChange = log.oldValue || log.newValue;

  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <History className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1 w-px bg-border" />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {getActionDescription(log)}
          </span>
          {log.field && (
            <span className="text-xs text-muted-foreground">
              ({log.field})
            </span>
          )}
        </div>

        {hasChange && (
          <div className="flex items-center gap-2 mt-1 text-xs">
            {log.oldValue && (
              <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                {log.oldValue}
              </span>
            )}
            {log.oldValue && log.newValue && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
            {log.newValue && (
              <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                {log.newValue}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {log.userEmail && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{log.userEmail}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <time>{formatDateTime(log.createdAt)}</time>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuditLog({ logs, defaultOpen = false }: AuditLogProps) {
  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Audit Log
                <span className="text-muted-foreground font-normal">
                  ({logs.length} entries)
                </span>
              </CardTitle>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px]">
              <div className="pr-4">
                {logs.map((log) => (
                  <AuditLogItem key={log.id} log={log} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

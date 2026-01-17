/**
 * Message Thread Component
 *
 * Displays ticket messages in chronological order with visual styling
 * based on message type (inbound, outbound, internal, system).
 */

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Send,
  MessageSquare,
  Bot,
  User,
  Clock,
} from "lucide-react";
import type { MessageType } from "@/db/schema";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  contentHtml?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  toEmail?: string | null;
  authorId?: string | null;
  createdAt: Date | string;
}

interface MessageThreadProps {
  messages: Message[];
  className?: string;
}

const messageConfig: Record<
  MessageType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    align: "left" | "right";
    bgClass: string;
  }
> = {
  INBOUND: {
    icon: Mail,
    label: "Customer",
    align: "left",
    bgClass: "bg-muted",
  },
  OUTBOUND: {
    icon: Send,
    label: "Agent Reply",
    align: "right",
    bgClass: "bg-primary text-primary-foreground",
  },
  INTERNAL: {
    icon: MessageSquare,
    label: "Internal Note",
    align: "right",
    bgClass: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  },
  SYSTEM: {
    icon: Bot,
    label: "System",
    align: "left",
    bgClass: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
};

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

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps) {
  const config = messageConfig[message.type];
  const Icon = config.icon;
  const isRight = config.align === "right";
  const isInternal = message.type === "INTERNAL";

  return (
    <div
      className={cn(
        "flex gap-3",
        isRight && "flex-row-reverse"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">
          {message.type === "INBOUND" || message.type === "SYSTEM" ? (
            getInitials(message.fromName, message.fromEmail)
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isRight && "items-end"
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{config.label}</span>
          {(message.fromName || message.fromEmail) && message.type === "INBOUND" && (
            <>
              <span>-</span>
              <span>{message.fromName || message.fromEmail}</span>
            </>
          )}
          {isInternal && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300">
              Internal
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "rounded-lg border p-3",
            config.bgClass,
            isInternal && "border-dashed"
          )}
        >
          {message.contentHtml ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: message.contentHtml }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <time>{formatDateTime(message.createdAt)}</time>
        </div>
      </div>
    </div>
  );
}

export function MessageThread({ messages, className }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-[500px]", className)}>
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message, index) => (
          <div key={message.id}>
            <MessageItem message={message} />
            {index < messages.length - 1 && (
              <Separator className="my-4" />
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

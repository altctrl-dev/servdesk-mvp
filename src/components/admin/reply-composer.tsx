"use client";

/**
 * Reply Composer Component
 *
 * Provides a form for composing ticket replies with type selection.
 * Supports OUTBOUND (customer reply) and INTERNAL (internal note) types.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, MessageSquare, AlertCircle } from "lucide-react";

interface ReplyComposerProps {
  ticketId: string;
  onSuccess?: () => void;
}

type ReplyType = "OUTBOUND" | "INTERNAL";

export function ReplyComposer({ ticketId, onSuccess }: ReplyComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [type, setType] = useState<ReplyType>("OUTBOUND");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Please enter a message");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content.trim(),
            type,
          }),
        });

        if (!response.ok) {
          const data = await response.json() as { error?: string };
          throw new Error(data.error || "Failed to send reply");
        }

        // Clear form on success
        setContent("");
        setType("OUTBOUND");

        // Refresh the page to show new message
        router.refresh();

        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="reply-type">Reply Type</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as ReplyType)}
          disabled={isPending}
        >
          <SelectTrigger id="reply-type" className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OUTBOUND">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Reply to Customer</span>
              </div>
            </SelectItem>
            <SelectItem value="INTERNAL">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Internal Note</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {type === "OUTBOUND"
            ? "This message will be sent to the customer via email"
            : "Internal notes are only visible to agents"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reply-content">Message</Label>
        <Textarea
          id="reply-content"
          placeholder={
            type === "OUTBOUND"
              ? "Type your reply to the customer..."
              : "Add an internal note..."
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isPending}
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !content.trim()}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              {type === "OUTBOUND" ? (
                <Send className="mr-2 h-4 w-4" />
              ) : (
                <MessageSquare className="mr-2 h-4 w-4" />
              )}
              {type === "OUTBOUND" ? "Send Reply" : "Add Note"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

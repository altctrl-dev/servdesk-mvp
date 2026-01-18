"use client";

/**
 * Create Ticket Dialog Component
 *
 * Dialog form for creating new tickets manually.
 * Used by SUPER_ADMIN to create tickets for phone calls or walk-ins.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { TICKET_PRIORITIES } from "@/db/schema";
import type { TicketPriority } from "@/db/schema";

/** Validation schema for create ticket form */
const createTicketFormSchema = z.object({
  customerEmail: z.string().email("Please enter a valid email address"),
  customerName: z.string().min(1, "Customer name is required").max(100, "Name too long"),
  subject: z.string().min(1, "Subject is required").max(255, "Subject too long"),
  content: z.string().min(1, "Description is required"),
  priority: z.enum(TICKET_PRIORITIES),
});

type CreateTicketFormData = z.infer<typeof createTicketFormSchema>;

interface ApiResponse {
  error?: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    customer: { id: string; email: string; name: string };
  };
}

interface CreateTicketDialogProps {
  onSuccess?: () => void;
}

/** Human-readable priority labels */
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export function CreateTicketDialog({ onSuccess }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketFormSchema),
    defaultValues: {
      customerEmail: "",
      customerName: "",
      subject: "",
      content: "",
      priority: "NORMAL",
    },
  });

  const currentPriority = watch("priority");

  const onSubmit = async (data: CreateTicketFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create ticket");
        return;
      }

      // Success
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error creating ticket:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Create a ticket manually for phone calls or walk-in requests.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Customer Email field */}
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="customer@example.com"
                disabled={isLoading}
                {...register("customerEmail")}
              />
              {errors.customerEmail && (
                <p className="text-sm text-destructive">{errors.customerEmail.message}</p>
              )}
            </div>

            {/* Customer Name field */}
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="John Doe"
                disabled={isLoading}
                {...register("customerName")}
              />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>

            {/* Subject field */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of the issue"
                disabled={isLoading}
                {...register("subject")}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            {/* Content/Description field */}
            <div className="space-y-2">
              <Label htmlFor="content">Description</Label>
              <Textarea
                id="content"
                placeholder="Detailed description of the customer's request..."
                rows={4}
                disabled={isLoading}
                {...register("content")}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>

            {/* Priority select */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={currentPriority}
                onValueChange={(value) => setValue("priority", value as TicketPriority)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-destructive">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Ticket"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

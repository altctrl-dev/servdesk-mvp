"use client";

/**
 * View Filters Form Component
 *
 * Reusable form component for creating and editing view filters.
 * Includes status, priority, assigned to, and search filters.
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/db/schema";
import type { ViewFilters, TicketStatus, TicketPriority } from "@/db/schema";

/** Human-readable status labels */
const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING_CUSTOMER: "Pending Customer",
  ON_HOLD: "On Hold",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** Human-readable priority labels */
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

/** Validation schema for view form */
const viewFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  status: z.array(z.enum(TICKET_STATUSES)).optional(),
  priority: z.array(z.enum(TICKET_PRIORITIES)).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export type ViewFormData = z.infer<typeof viewFormSchema>;

/** Type for assignable users */
interface AssignableUser {
  id: string;
  email: string;
  name: string | null;
  role?: string;
}

interface ViewFiltersFormProps {
  /** Initial values for editing an existing view */
  initialValues?: {
    name: string;
    description?: string | null;
    filters: ViewFilters;
    isShared?: boolean;
    isDefault?: boolean;
  };
  /** Whether the user can create shared views (SUPERVISOR+) */
  canShare?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Submit button text */
  submitLabel?: string;
  /** Form submission handler */
  onSubmit: (data: ViewFormData) => Promise<void>;
  /** Cancel handler */
  onCancel?: () => void;
}

export function ViewFiltersForm({
  initialValues,
  canShare = false,
  isLoading = false,
  error,
  submitLabel = "Create View",
  onSubmit,
  onCancel,
}: ViewFiltersFormProps) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Fetch assignable users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users/assignable");
        if (response.ok) {
          const data = (await response.json()) as { users: AssignableUser[] };
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch assignable users:", err);
      } finally {
        setUsersLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ViewFormData>({
    resolver: zodResolver(viewFormSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      status: initialValues?.filters?.status || [],
      priority: initialValues?.filters?.priority || [],
      assignedTo: initialValues?.filters?.assignedTo || "",
      search: initialValues?.filters?.search || "",
      isShared: initialValues?.isShared || false,
      isDefault: initialValues?.isDefault || false,
    },
  });

  const watchedStatus = watch("status") || [];
  const watchedPriority = watch("priority") || [];
  const watchedAssignedTo = watch("assignedTo") || "";
  const watchedIsShared = watch("isShared") || false;
  const watchedIsDefault = watch("isDefault") || false;

  const handleStatusToggle = (status: TicketStatus, checked: boolean) => {
    const current = watchedStatus;
    if (checked) {
      setValue("status", [...current, status]);
    } else {
      setValue(
        "status",
        current.filter((s) => s !== status)
      );
    }
  };

  const handlePriorityToggle = (priority: TicketPriority, checked: boolean) => {
    const current = watchedPriority;
    if (checked) {
      setValue("priority", [...current, priority]);
    } else {
      setValue(
        "priority",
        current.filter((p) => p !== priority)
      );
    }
  };

  const handleFormSubmit = async (data: ViewFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* View Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="My Custom View"
          disabled={isLoading}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description for this view..."
          rows={2}
          disabled={isLoading}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Filters Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Filters</h3>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TICKET_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={watchedStatus.includes(status)}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    handleStatusToggle(status, checked === true)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor={`status-${status}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {STATUS_LABELS[status]}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave all unchecked to include all statuses
          </p>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="flex flex-wrap gap-4">
            {TICKET_PRIORITIES.map((priority) => (
              <div key={priority} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority}`}
                  checked={watchedPriority.includes(priority)}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    handlePriorityToggle(priority, checked === true)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor={`priority-${priority}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {PRIORITY_LABELS[priority]}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave all unchecked to include all priorities
          </p>
        </div>

        {/* Assigned To Filter */}
        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned To</Label>
          <Select
            value={watchedAssignedTo}
            onValueChange={(value) => setValue("assignedTo", value)}
            disabled={isLoading || usersLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Anyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Filter */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Term</Label>
          <Input
            id="search"
            placeholder="Search in subject or ticket number..."
            disabled={isLoading}
            {...register("search")}
          />
          <p className="text-xs text-muted-foreground">
            Search will match ticket subject or ticket number
          </p>
        </div>
      </div>

      {/* Options Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Options</h3>

        {/* Share with Team */}
        {canShare && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isShared"
              checked={watchedIsShared}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                setValue("isShared", checked === true)
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="isShared"
              className="text-sm font-normal cursor-pointer"
            >
              Share with team
            </Label>
          </div>
        )}

        {/* Set as Default */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDefault"
            checked={watchedIsDefault}
            onCheckedChange={(checked: boolean | "indeterminate") =>
              setValue("isDefault", checked === true)
            }
            disabled={isLoading}
          />
          <Label
            htmlFor="isDefault"
            className="text-sm font-normal cursor-pointer"
          >
            Set as my default view
          </Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

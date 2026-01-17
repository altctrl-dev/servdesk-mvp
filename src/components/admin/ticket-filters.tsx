"use client";

/**
 * Ticket Filters Component
 *
 * Provides filtering controls for the ticket list.
 * Includes status tabs, priority filter, and search input.
 */

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketFiltersProps {
  defaultStatus?: string;
  defaultPriority?: string;
  defaultSearch?: string;
}

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "OPEN", label: "Open" },
  { value: "PENDING_CUSTOMER", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const priorityOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
];

export function TicketFilters({
  defaultStatus = "all",
  defaultPriority = "all",
  defaultSearch = "",
}: TicketFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [name, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(name);
        } else {
          params.set(name, value);
        }
      }

      // Reset to page 1 when filters change
      params.delete("page");

      return params.toString();
    },
    [searchParams]
  );

  const handleStatusChange = (value: string) => {
    const query = createQueryString({ status: value });
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const handlePriorityChange = (value: string) => {
    const query = createQueryString({ priority: value });
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const query = createQueryString({ search: value });
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters =
    defaultStatus !== "all" ||
    defaultPriority !== "all" ||
    defaultSearch !== "";

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs */}
      <Tabs value={defaultStatus} onValueChange={handleStatusChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          {statusOptions.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="text-xs sm:text-sm"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search and additional filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            defaultValue={defaultSearch}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={defaultPriority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * User Management Client Component
 *
 * Handles user listing, filtering, and CRUD operations.
 * Separated from page.tsx for client-side interactivity.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { UserTable, UserTableSkeleton } from "@/components/admin/user-table";
import { UserForm } from "@/components/admin/user-form";
import { InviteUserDialog } from "@/components/admin/invite-user-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/db/schema";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsersResponse {
  users: User[];
  pendingInvitations: PendingInvitation[];
  pagination: Pagination;
}

interface UserManagementProps {
  currentUserId: string;
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch users from API */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", searchParams.get("page") || "1");
      params.set("limit", "20");

      const roleFilter = searchParams.get("role");
      if (roleFilter) {
        params.set("role", roleFilter);
      }

      const activeFilter = searchParams.get("isActive");
      if (activeFilter) {
        params.set("isActive", activeFilter);
      }

      const response = await fetch(`/api/users?${params.toString()}`);
      const data: UsersResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as unknown as { error: string }).error || "Failed to fetch users");
      }

      setUsers(data.users);
      setPendingInvitations(data.pendingInvitations || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  // Fetch users on mount and when search params change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /** Handle page changes */
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  /** Handle refresh */
  const handleRefresh = () => {
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <InviteUserDialog onSuccess={handleRefresh} />
          <UserForm onSuccess={handleRefresh} />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* User table */}
      {isLoading && users.length === 0 ? (
        <UserTableSkeleton />
      ) : (
        <UserTable
          users={users}
          pendingInvitations={pendingInvitations}
          pagination={pagination}
          currentUserId={currentUserId}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

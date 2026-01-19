"use client";

/**
 * User Table Component
 *
 * Displays a table of users with actions for role changes and activation/deactivation.
 * SUPER_ADMIN only component.
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleBadge, RoleSelect } from "./role-select";
import {
  MoreHorizontal,
  UserCog,
  UserMinus,
  UserCheck,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  KeyRound,
} from "lucide-react";
import type { UserRole } from "@/db/schema";
import { useToast } from "@/hooks/use-toast";

interface ApiResponse {
  error?: string;
  message?: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserTableProps {
  users: User[];
  pagination: Pagination;
  currentUserId: string;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UserTable({
  users,
  pagination,
  currentUserId,
  isLoading,
  onPageChange,
  onRefresh,
}: UserTableProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deactivateDialog, setDeactivateDialog] = useState<User | null>(null);

  /** Trigger password reset */
  async function handleResetPassword(user: User) {
    setActionLoading(user.id);
    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to send password reset",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Password reset email sent to ${user.email}`,
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  /** Update user role */
  async function handleRoleChange(userId: string, newRole: UserRole) {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to update role",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
      onRefresh();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  /** Toggle user active status */
  async function handleToggleActive(user: User) {
    // If deactivating, show confirmation dialog
    if (user.isActive) {
      setDeactivateDialog(user);
      return;
    }

    // Reactivating doesn't need confirmation
    await performToggleActive(user.id, true);
  }

  /** Actually perform the activation toggle */
  async function performToggleActive(userId: string, newIsActive: boolean) {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: newIsActive ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: newIsActive ? JSON.stringify({ isActive: true }) : undefined,
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to update user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: newIsActive
          ? "User reactivated successfully"
          : "User deactivated successfully",
      });
      onRefresh();
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setDeactivateDialog(null);
    }
  }

  if (isLoading) {
    return <UserTableSkeleton />;
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">2FA</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isActionLoading = actionLoading === user.id;

                return (
                  <TableRow key={user.id}>
                    {/* User info */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.name || "Unnamed User"}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                        {/* Show role on mobile */}
                        <div className="mt-1 sm:hidden">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="hidden sm:table-cell">
                      {isSelf ? (
                        <RoleBadge role={user.role} />
                      ) : (
                        <RoleSelect
                          value={user.role}
                          onValueChange={(newRole) =>
                            handleRoleChange(user.id, newRole)
                          }
                          disabled={isActionLoading}
                          className="w-[160px]"
                        />
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "secondary"}
                        className="flex items-center gap-1 w-fit"
                      >
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserMinus className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>

                    {/* 2FA Status */}
                    <TableCell className="hidden md:table-cell">
                      {user.twoFactorEnabled ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Shield className="h-3 w-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </TableCell>

                    {/* Created date */}
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{formatDate(user.createdAt)}</span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* Change role - mobile only since desktop has inline select */}
                          <div className="sm:hidden px-2 py-1.5">
                            <p className="text-sm font-medium mb-2">Change Role</p>
                            <RoleSelect
                              value={user.role}
                              onValueChange={(newRole) =>
                                handleRoleChange(user.id, newRole)
                              }
                              disabled={isSelf || isActionLoading}
                              className="w-full"
                            />
                          </div>
                          <DropdownMenuSeparator className="sm:hidden" />

                          {/* Reset password */}
                          {!isSelf && user.isActive && (
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user)}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                          )}

                          {/* Toggle active status */}
                          {!isSelf && (
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(user)}
                            >
                              {user.isActive ? (
                                <>
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Reactivate
                                </>
                              )}
                            </DropdownMenuItem>
                          )}

                          {isSelf && (
                            <DropdownMenuItem disabled>
                              <UserCog className="mr-2 h-4 w-4" />
                              Cannot modify self
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!deactivateDialog}
        onOpenChange={(open) => !open && setDeactivateDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{deactivateDialog?.name || deactivateDialog?.email}</strong>?
              They will no longer be able to log in until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deactivateDialog && performToggleActive(deactivateDialog.id, false)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function UserTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">2FA</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-6 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

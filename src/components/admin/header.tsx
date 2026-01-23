"use client";

/**
 * Admin Header Component
 *
 * Displays user information and provides sign-out functionality.
 * Includes mobile menu trigger with multi-role RBAC support.
 */

import { MobileSidebar } from "./sidebar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { UserRole } from "@/db/schema";
import { getHighestRole } from "@/lib/permissions";

interface HeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  /** User's roles for RBAC filtering */
  userRoles: UserRole[];
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "SUPERVISOR":
      return "Supervisor";
    case "AGENT":
      return "Agent";
    default:
      return role;
  }
}

function getUserInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function Header({ user, userRoles }: HeaderProps) {
  const initials = getUserInitials(user.name, user.email);
  // Get the highest role for display purposes
  const displayRole = getHighestRole(userRoles) || "AGENT";

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileSidebar userRoles={userRoles} />

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start text-left sm:flex">
              <span className="text-sm font-medium">
                {user.name || user.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {getRoleDisplayName(displayRole)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <div className="flex items-center justify-between">
              <span>Role</span>
              <Badge variant="secondary" className="text-xs">
                {getRoleDisplayName(displayRole)}
              </Badge>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-0">
            <div className="w-full px-2 py-1.5">
              <SignOutButton />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

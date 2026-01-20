"use client";

/**
 * Reusable Navbar Component
 *
 * Top navigation bar with breadcrumbs, search, theme toggle, and user menu.
 * Fully configurable via props.
 */

import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui-store";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Settings, User, type LucideIcon } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface UserMenuAction {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "destructive";
}

export interface NavbarConfig {
  breadcrumbs?: BreadcrumbItem[];
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  userMenuActions?: UserMenuAction[];
  rightContent?: React.ReactNode;
}

interface NavbarProps {
  config: NavbarConfig;
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

function UserMenu({
  user,
  actions,
}: {
  user: NavbarConfig["user"];
  actions?: UserMenuAction[];
}) {
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Default menu items */}
        <DropdownMenuItem asChild>
          <a href="/dashboard/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/dashboard/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </a>
        </DropdownMenuItem>

        {/* Custom actions */}
        {actions && actions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={action.onClick}
                  asChild={!!action.href}
                  className={cn(
                    "cursor-pointer",
                    action.variant === "destructive" && "text-destructive focus:text-destructive"
                  )}
                >
                  {action.href ? (
                    <a href={action.href}>
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </a>
                  ) : (
                    <div className="flex items-center">
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Main Navbar Component
// =============================================================================

export function Navbar({ config, className }: NavbarProps) {
  const { sidebarCollapsed, toggleMobileMenu } = useUIStore();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-all duration-300",
        // Offset for sidebar
        sidebarCollapsed ? "md:pl-[calc(64px+1rem)]" : "md:pl-[calc(256px+1rem)]",
        className
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="mr-2 md:hidden"
        onClick={toggleMobileMenu}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Breadcrumbs */}
      <div className="flex-1">
        {config.breadcrumbs && <Breadcrumbs items={config.breadcrumbs} />}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {config.rightContent}
        <ThemeToggle />
        <UserMenu user={config.user} actions={config.userMenuActions} />
      </div>
    </header>
  );
}

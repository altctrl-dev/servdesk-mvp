"use client";

/**
 * Admin Sidebar Navigation Component
 *
 * Provides navigation links for the admin dashboard.
 * Responsive design with mobile sheet support.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "SUPER_ADMIN" | "ADMIN" | "VIEW_ONLY";
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tickets",
    href: "/dashboard/tickets",
    icon: Ticket,
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    requiredRole: "SUPER_ADMIN",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    requiredRole: "SUPER_ADMIN",
  },
];

interface SidebarProps {
  userRole: "SUPER_ADMIN" | "ADMIN" | "VIEW_ONLY";
}

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.title}
    </Link>
  );
}

function SidebarNav({
  userRole,
  onNavigate,
}: {
  userRole: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (userRole === "SUPER_ADMIN") return true;
    if (userRole === "ADMIN" && item.requiredRole !== "SUPER_ADMIN") return true;
    return false;
  });

  return (
    <nav className="flex flex-col gap-1">
      {filteredNavItems.map((item) => {
        // For dashboard, only exact match; for others, prefix match
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive}
            onClick={onNavigate}
          />
        );
      })}
    </nav>
  );
}

export function Sidebar({ userRole }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Ticket className="h-5 w-5" />
          <span>ServDesk</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <SidebarNav userRole={userRole} />
      </ScrollArea>
    </aside>
  );
}

export function MobileSidebar({ userRole }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
            onClick={() => setOpen(false)}
          >
            <Ticket className="h-5 w-5" />
            <span>ServDesk</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <SidebarNav userRole={userRole} onNavigate={() => setOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

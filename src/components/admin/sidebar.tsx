"use client";

/**
 * Admin Sidebar Navigation Component
 *
 * Provides navigation links for the admin dashboard.
 * Responsive design with mobile sheet support.
 * Supports collapsible sections for admin items.
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
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "SUPER_ADMIN" | "ADMIN" | "VIEW_ONLY";
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "SUPER_ADMIN" | "ADMIN" | "VIEW_ONLY";
  items: NavItem[];
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
];

const adminSection: NavSection = {
  title: "Admin",
  icon: Shield,
  requiredRole: "SUPER_ADMIN",
  items: [
    {
      title: "Users",
      href: "/dashboard/users",
      icon: Users,
      requiredRole: "SUPER_ADMIN",
    },
  ],
};

const bottomNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  userRole: "SUPER_ADMIN" | "ADMIN" | "VIEW_ONLY";
}

function NavLink({
  item,
  isActive,
  onClick,
  indented = false,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
  indented?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        indented && "ml-4",
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

function NavSectionCollapsible({
  section,
  userRole,
  onNavigate,
}: {
  section: NavSection;
  userRole: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Check if any child is active
  const hasActiveChild = section.items.some((item) =>
    pathname.startsWith(item.href)
  );

  const [isOpen, setIsOpen] = useState(hasActiveChild);

  // Filter items based on role
  const filteredItems = section.items.filter((item) => {
    if (!item.requiredRole) return true;
    if (userRole === "SUPER_ADMIN") return true;
    if (userRole === "ADMIN" && item.requiredRole !== "SUPER_ADMIN") return true;
    return false;
  });

  if (filteredItems.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            hasActiveChild
              ? "text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <section.icon className="h-4 w-4" />
          {section.title}
          {isOpen ? (
            <ChevronDown className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1">
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive}
              onClick={onNavigate}
              indented
            />
          );
        })}
      </CollapsibleContent>
    </Collapsible>
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

  // Filter top-level nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (userRole === "SUPER_ADMIN") return true;
    if (userRole === "ADMIN" && item.requiredRole !== "SUPER_ADMIN") return true;
    return false;
  });

  // Check if admin section should be shown
  const showAdminSection =
    !adminSection.requiredRole ||
    userRole === "SUPER_ADMIN" ||
    (userRole === "ADMIN" && adminSection.requiredRole !== "SUPER_ADMIN");

  // Filter bottom nav items based on user role
  const filteredBottomNavItems = bottomNavItems.filter((item) => {
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

      {showAdminSection && (
        <NavSectionCollapsible
          section={adminSection}
          userRole={userRole}
          onNavigate={onNavigate}
        />
      )}

      {filteredBottomNavItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
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

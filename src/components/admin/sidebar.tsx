"use client";

/**
 * Admin Sidebar Navigation Component
 *
 * Provides navigation links for the admin dashboard.
 * Responsive design with mobile sheet support.
 * Supports collapsible sections with multi-role RBAC filtering.
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
  Inbox,
  Eye,
  BookOpen,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  UserCircle,
  UsersRound,
  HelpCircle,
  FileText,
  FolderOpen,
  Plus,
  Timer,
  TrendingUp,
  KeyRound,
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
import type { UserRole } from "@/db/schema";
import { hasAnyRole } from "@/lib/permissions";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that can access this item. If undefined, all roles can access. */
  requiredRoles?: UserRole[];
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that can access this section. If undefined, all roles can access. */
  requiredRoles?: UserRole[];
  items: NavItem[];
}

// =============================================================================
// NAVIGATION CONFIGURATION
// =============================================================================

/** Top-level navigation items (not in sections) */
const topNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

/** Inbox section with queue views */
const inboxSection: NavSection = {
  title: "Inbox",
  icon: Inbox,
  items: [
    {
      title: "My Queue",
      href: "/dashboard/inbox/my",
      icon: UserCircle,
    },
    {
      title: "Team Queue",
      href: "/dashboard/inbox/team",
      icon: UsersRound,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Unassigned",
      href: "/dashboard/inbox/unassigned",
      icon: HelpCircle,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
  ],
};

/** Tickets section with status-based views */
const ticketsSection: NavSection = {
  title: "Tickets",
  icon: Ticket,
  items: [
    {
      title: "Open",
      href: "/dashboard/tickets/open",
      icon: Ticket,
    },
    {
      title: "Pending",
      href: "/dashboard/tickets/pending",
      icon: Clock,
    },
    {
      title: "On Hold",
      href: "/dashboard/tickets/on-hold",
      icon: Timer,
    },
    {
      title: "Resolved",
      href: "/dashboard/tickets/resolved",
      icon: CheckCircle,
    },
    {
      title: "Closed",
      href: "/dashboard/tickets/closed",
      icon: XCircle,
    },
    {
      title: "Trash",
      href: "/dashboard/tickets/trash",
      icon: Trash2,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
  ],
};

/** Views section for saved ticket views */
const viewsSection: NavSection = {
  title: "Views",
  icon: Eye,
  items: [
    {
      title: "My Views",
      href: "/dashboard/views",
      icon: Eye,
    },
    {
      title: "Shared Views",
      href: "/dashboard/views/shared",
      icon: UsersRound,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Create View",
      href: "/dashboard/views/new",
      icon: Plus,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
  ],
};

/** Knowledge Base section for help articles */
const knowledgeBaseSection: NavSection = {
  title: "Knowledge Base",
  icon: BookOpen,
  items: [
    {
      title: "Articles",
      href: "/dashboard/knowledge-base/articles",
      icon: FileText,
    },
    {
      title: "Drafts",
      href: "/dashboard/knowledge-base/drafts",
      icon: FileText,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Categories",
      href: "/dashboard/knowledge-base/categories",
      icon: FolderOpen,
      requiredRoles: ["ADMIN", "SUPER_ADMIN"],
    },
  ],
};

/** Reports section for analytics and metrics */
const reportsSection: NavSection = {
  title: "Reports",
  icon: BarChart3,
  requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  items: [
    {
      title: "Team",
      href: "/dashboard/reports/team",
      icon: UsersRound,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "SLA",
      href: "/dashboard/reports/sla",
      icon: Timer,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Volume",
      href: "/dashboard/reports/volume",
      icon: TrendingUp,
      requiredRoles: ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
    },
  ],
};

/** Admin section for system administration */
const adminSection: NavSection = {
  title: "Admin",
  icon: Shield,
  requiredRoles: ["ADMIN", "SUPER_ADMIN"],
  items: [
    {
      title: "Users",
      href: "/dashboard/admin/users",
      icon: Users,
      requiredRoles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Roles",
      href: "/dashboard/admin/roles",
      icon: KeyRound,
      requiredRoles: ["SUPER_ADMIN"],
    },
  ],
};

/** All navigation sections in display order */
const navSections: NavSection[] = [
  inboxSection,
  ticketsSection,
  viewsSection,
  knowledgeBaseSection,
  reportsSection,
  adminSection,
];

/** Bottom navigation items */
const bottomNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface SidebarProps {
  userRoles: UserRole[];
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Renders a single navigation link item
 */
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

/**
 * Renders a collapsible navigation section with role-based filtering
 */
function NavSectionCollapsible({
  section,
  userRoles,
  onNavigate,
}: {
  section: NavSection;
  userRoles: UserRole[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Filter items based on user roles
  const filteredItems = section.items.filter((item) => {
    if (!item.requiredRoles) return true;
    return hasAnyRole(userRoles, item.requiredRoles);
  });

  // Check if any child is active
  const hasActiveChild = filteredItems.some((item) =>
    pathname.startsWith(item.href)
  );

  // useState must be called unconditionally before any early returns
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  // Don't render section if no items are visible
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

/**
 * Main sidebar navigation component with role-based filtering
 */
function SidebarNav({
  userRoles,
  onNavigate,
}: {
  userRoles: UserRole[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Filter top-level nav items based on user roles
  const filteredTopNavItems = topNavItems.filter((item) => {
    if (!item.requiredRoles) return true;
    return hasAnyRole(userRoles, item.requiredRoles);
  });

  // Filter sections based on user roles
  const filteredSections = navSections.filter((section) => {
    // Check if section itself has role requirements
    if (section.requiredRoles && !hasAnyRole(userRoles, section.requiredRoles)) {
      return false;
    }
    // Check if section has any visible items after filtering
    const visibleItems = section.items.filter((item) => {
      if (!item.requiredRoles) return true;
      return hasAnyRole(userRoles, item.requiredRoles);
    });
    return visibleItems.length > 0;
  });

  // Filter bottom nav items based on user roles
  const filteredBottomNavItems = bottomNavItems.filter((item) => {
    if (!item.requiredRoles) return true;
    return hasAnyRole(userRoles, item.requiredRoles);
  });

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-1 flex-col gap-1">
        {/* Top-level items */}
        {filteredTopNavItems.map((item) => {
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

        {/* Collapsible sections */}
        {filteredSections.map((section) => (
          <NavSectionCollapsible
            key={section.title}
            section={section}
            userRoles={userRoles}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom navigation - separated with margin */}
      {filteredBottomNavItems.length > 0 && (
        <nav className="mt-auto border-t pt-4">
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
      )}
    </div>
  );
}

// =============================================================================
// EXPORTED COMPONENTS
// =============================================================================

/**
 * Desktop sidebar component
 */
export function Sidebar({ userRoles }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Ticket className="h-5 w-5" />
          <span>ServDesk</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <SidebarNav userRoles={userRoles} />
      </ScrollArea>
    </aside>
  );
}

/**
 * Mobile sidebar component with sheet overlay
 */
export function MobileSidebar({ userRoles }: SidebarProps) {
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
          <SidebarNav userRoles={userRoles} onNavigate={() => setOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

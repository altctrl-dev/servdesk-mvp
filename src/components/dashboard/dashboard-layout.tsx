"use client";

/**
 * Dashboard Layout Client Component
 *
 * Provides the dashboard-specific configuration for the reusable layout components.
 * This separates the configuration from the layout wrapper for better maintainability.
 */

import { usePathname } from "next/navigation";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";
import type { SidebarConfig, NavbarConfig } from "@/components/layout/index";
import { signOut } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Ticket,
  Shield,
  Users,
  Settings,
  LogOut,
  Inbox,
  Eye,
  BookOpen,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  UsersRound,
  FolderOpen,
  Plus,
  FileText,
  Timer,
  TrendingUp,
  LayoutList,
} from "lucide-react";
import type { UserRole } from "@/db/schema";
import { hasAnyRole } from "@/lib/permissions";

// =============================================================================
// Configuration
// =============================================================================

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  userRoles: UserRole[];
}

// Generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href?: string }[] = [];

  // Mapping of path segments to labels
  const labelMap: Record<string, string> = {
    dashboard: "Dashboard",
    tickets: "Tickets",
    users: "Users",
    settings: "Settings",
    admin: "Admin",
    security: "Security",
    inbox: "Inbox",
    views: "Views",
    "knowledge-base": "Knowledge Base",
    reports: "Reports",
    my: "My Queue",
    team: "Team Queue",
    unassigned: "Unassigned",
    all: "All",
    open: "Open",
    pending: "Pending",
    "on-hold": "On Hold",
    resolved: "Resolved",
    closed: "Closed",
    trash: "Trash",
    shared: "Shared",
    new: "New",
    articles: "Articles",
    drafts: "Drafts",
    categories: "Categories",
    sla: "SLA",
    volume: "Volume",
    roles: "Roles",
  };

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Check if it's a dynamic segment (like ticket ID)
    if (segment.startsWith("[") || /^[a-z0-9-]+$/i.test(segment) && !labelMap[segment]) {
      // It might be an ID, try to format it nicely
      if (segment.startsWith("TKT-") || segment.length > 10) {
        breadcrumbs.push({
          label: segment,
          href: isLast ? undefined : currentPath,
        });
      }
      return;
    }

    breadcrumbs.push({
      label: labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}

// =============================================================================
// Sidebar Configuration Generator
// =============================================================================

// Role constants for filtering
const ALL_ROLES: UserRole[] = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
const SUPERVISOR_PLUS: UserRole[] = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
const ADMIN_PLUS: UserRole[] = ["ADMIN", "SUPER_ADMIN"];
const SUPER_ADMIN_ONLY: UserRole[] = ["SUPER_ADMIN"];

/**
 * Generates sidebar configuration based on user roles
 * Filters sections and items based on role permissions
 */
function generateSidebarConfig(userRoles: UserRole[], pathname: string): SidebarConfig {
  // Helper to check if user has access to an item
  const canAccess = (allowedRoles: UserRole[]) => hasAnyRole(userRoles, allowedRoles);

  // Define all sections with their items and required roles
  const sections: SidebarConfig["sections"] = [];

  // Inbox section
  const inboxItems = [
    { title: "My Queue", href: "/dashboard/inbox/my", icon: Inbox, roles: ALL_ROLES },
    { title: "Team Queue", href: "/dashboard/inbox/team", icon: UsersRound, roles: SUPERVISOR_PLUS },
    { title: "Unassigned", href: "/dashboard/inbox/unassigned", icon: FolderOpen, roles: SUPERVISOR_PLUS },
  ];
  const accessibleInboxItems = inboxItems.filter(item => canAccess(item.roles));
  if (accessibleInboxItems.length > 0) {
    sections.push({
      title: "Inbox",
      icon: Inbox,
      defaultOpen: pathname.startsWith("/dashboard/inbox"),
      items: accessibleInboxItems.map(({ title, href, icon }) => ({ title, href, icon })),
    });
  }

  // Tickets section
  const ticketsItems = [
    { title: "All", href: "/dashboard/tickets", icon: LayoutList, roles: ALL_ROLES },
    { title: "Open", href: "/dashboard/tickets/open", icon: Ticket, roles: ALL_ROLES },
    { title: "Pending", href: "/dashboard/tickets/pending", icon: Clock, roles: ALL_ROLES },
    { title: "On Hold", href: "/dashboard/tickets/on-hold", icon: Timer, roles: ALL_ROLES },
    { title: "Resolved", href: "/dashboard/tickets/resolved", icon: CheckCircle, roles: ALL_ROLES },
    { title: "Closed", href: "/dashboard/tickets/closed", icon: XCircle, roles: ALL_ROLES },
    { title: "Trash", href: "/dashboard/tickets/trash", icon: Trash2, roles: SUPERVISOR_PLUS },
  ];
  const accessibleTicketsItems = ticketsItems.filter(item => canAccess(item.roles));
  if (accessibleTicketsItems.length > 0) {
    sections.push({
      title: "Tickets",
      icon: Ticket,
      defaultOpen: pathname.startsWith("/dashboard/tickets"),
      items: accessibleTicketsItems.map(({ title, href, icon }) => ({ title, href, icon })),
    });
  }

  // Views section
  const viewsItems = [
    { title: "My Views", href: "/dashboard/views", icon: Eye, roles: ALL_ROLES },
    { title: "Shared Views", href: "/dashboard/views/shared", icon: Users, roles: SUPERVISOR_PLUS },
    { title: "Create View", href: "/dashboard/views/new", icon: Plus, roles: SUPERVISOR_PLUS },
  ];
  const accessibleViewsItems = viewsItems.filter(item => canAccess(item.roles));
  if (accessibleViewsItems.length > 0) {
    sections.push({
      title: "Views",
      icon: Eye,
      defaultOpen: pathname.startsWith("/dashboard/views"),
      items: accessibleViewsItems.map(({ title, href, icon }) => ({ title, href, icon })),
    });
  }

  // Knowledge Base section
  const kbItems = [
    { title: "Articles", href: "/dashboard/knowledge-base/articles", icon: FileText, roles: ALL_ROLES },
    { title: "Drafts", href: "/dashboard/knowledge-base/drafts", icon: BookOpen, roles: SUPERVISOR_PLUS },
    { title: "Categories", href: "/dashboard/knowledge-base/categories", icon: FolderOpen, roles: ADMIN_PLUS },
  ];
  const accessibleKbItems = kbItems.filter(item => canAccess(item.roles));
  if (accessibleKbItems.length > 0) {
    sections.push({
      title: "Knowledge Base",
      icon: BookOpen,
      defaultOpen: pathname.startsWith("/dashboard/knowledge-base"),
      items: accessibleKbItems.map(({ title, href, icon }) => ({ title, href, icon })),
    });
  }

  // Reports section (SUPERVISOR+ only)
  if (canAccess(SUPERVISOR_PLUS)) {
    const reportsItems = [
      { title: "Team", href: "/dashboard/reports/team", icon: UsersRound, roles: SUPERVISOR_PLUS },
      { title: "SLA", href: "/dashboard/reports/sla", icon: Timer, roles: SUPERVISOR_PLUS },
      { title: "Volume", href: "/dashboard/reports/volume", icon: TrendingUp, roles: SUPERVISOR_PLUS },
    ];
    const accessibleReportsItems = reportsItems.filter(item => canAccess(item.roles));
    if (accessibleReportsItems.length > 0) {
      sections.push({
        title: "Reports",
        icon: BarChart3,
        defaultOpen: pathname.startsWith("/dashboard/reports"),
        items: accessibleReportsItems.map(({ title, href, icon }) => ({ title, href, icon })),
      });
    }
  }

  // Admin section (ADMIN+ only)
  if (canAccess(ADMIN_PLUS)) {
    const adminItems = [
      { title: "Users", href: "/dashboard/admin/users", icon: Users, roles: ADMIN_PLUS },
      { title: "Roles", href: "/dashboard/admin/roles", icon: Shield, roles: SUPER_ADMIN_ONLY },
    ];
    const accessibleAdminItems = adminItems.filter(item => canAccess(item.roles));
    if (accessibleAdminItems.length > 0) {
      sections.push({
        title: "Admin",
        icon: Shield,
        defaultOpen: pathname.startsWith("/dashboard/admin"),
        items: accessibleAdminItems.map(({ title, href, icon }) => ({ title, href, icon })),
      });
    }
  }

  return {
    title: "ServDesk",
    mainItems: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
    sections: sections.length > 0 ? sections : undefined,
    bottomItems: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  };
}

// =============================================================================
// Component
// =============================================================================

export function DashboardLayout({ children, user, userRoles }: DashboardLayoutProps) {
  const pathname = usePathname();

  // Generate sidebar configuration based on user roles
  const sidebarConfig = generateSidebarConfig(userRoles, pathname);

  // Navbar configuration
  const navbarConfig: NavbarConfig = {
    breadcrumbs: generateBreadcrumbs(pathname),
    user: {
      name: user.name || user.email,
      email: user.email,
    },
    userMenuActions: [
      {
        label: "Sign out",
        icon: LogOut,
        onClick: () => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } }),
        variant: "destructive",
      },
    ],
  };

  return (
    <LayoutWrapper sidebarConfig={sidebarConfig} navbarConfig={navbarConfig}>
      {children}
    </LayoutWrapper>
  );
}

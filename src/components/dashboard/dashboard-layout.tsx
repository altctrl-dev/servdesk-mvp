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
} from "lucide-react";
import type { UserRole } from "@/db/schema";

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
  role: UserRole;
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
// Component
// =============================================================================

export function DashboardLayout({ children, user, role }: DashboardLayoutProps) {
  const pathname = usePathname();

  // Sidebar configuration
  const sidebarConfig: SidebarConfig = {
    title: "ServDesk",
    mainItems: [
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
    ],
    sections:
      role === "SUPER_ADMIN"
        ? [
            {
              title: "Admin",
              icon: Shield,
              defaultOpen: pathname.startsWith("/dashboard/admin") || pathname.startsWith("/dashboard/users"),
              items: [
                {
                  title: "Users",
                  href: "/dashboard/users",
                  icon: Users,
                },
              ],
            },
          ]
        : undefined,
    bottomItems: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  };

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

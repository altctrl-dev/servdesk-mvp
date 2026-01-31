"use client";

/**
 * Layout Wrapper Component
 *
 * Combines Sidebar, Navbar, and main content area with panel system support.
 * Provides the complete dashboard layout structure.
 */

import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui-store";
import { Sidebar, type SidebarConfig } from "./sidebar";
import { Navbar, type NavbarConfig } from "./navbar";
import { PanelContainer } from "@/components/layout/panel-container";

interface LayoutWrapperProps {
  children: React.ReactNode;
  sidebarConfig: SidebarConfig;
  navbarConfig: NavbarConfig;
  className?: string;
}

export function LayoutWrapper({
  children,
  sidebarConfig,
  navbarConfig,
  className,
}: LayoutWrapperProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="relative min-h-screen">
      {/* Sidebar */}
      <Sidebar config={sidebarConfig} />

      {/* Main area - only transition margin, not colors */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Navbar */}
        <Navbar config={navbarConfig} />

        {/* Content */}
        <main className={cn("flex-1 p-6", className)}>{children}</main>
      </div>

      {/* Panel Container */}
      <PanelContainer />
    </div>
  );
}

"use client";

/**
 * Reusable Sidebar Component
 *
 * A collapsible sidebar navigation that accepts configuration via props.
 * Features:
 * - Collapsible with persisted state
 * - Tooltips in collapsed mode
 * - Badge support for notifications
 * - Collapsible sections
 * - Mobile overlay mode
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
}

export interface NavSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

export interface SidebarConfig {
  logo?: React.ReactNode;
  title?: string;
  mainItems: NavItem[];
  sections?: NavSection[];
  bottomItems?: NavItem[];
}

interface SidebarProps {
  config: SidebarConfig;
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

interface NavItemLinkProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavItemLink({ item, isActive, isCollapsed }: NavItemLinkProps) {
  const Icon = item.icon;

  const content = (
    <Link
      href={item.disabled ? "#" : item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))] font-medium"
          : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]",
        item.disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* Icon - NEVER shrinks, stays fixed */}
      <div className="relative flex-shrink-0">
        <Icon className="h-5 w-5" />
        {/* Badge dot when collapsed */}
        {isCollapsed && item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </div>

      {/* Label - collapses to zero width when sidebar is collapsed */}
      <span
        className={cn(
          "flex-1 whitespace-nowrap overflow-hidden transition-all duration-300",
          isCollapsed ? "opacity-0 w-0" : "opacity-100"
        )}
      >
        {item.title}
      </span>

      {/* Badge - also collapses to zero width */}
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            "flex h-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 min-w-0 px-0" : "opacity-100 min-w-5 px-1.5"
          )}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <div className="flex items-center gap-2">
            {item.title}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {item.badge}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

interface CollapsibleSectionProps {
  section: NavSection;
  isCollapsed: boolean;
  pathname: string;
}

function CollapsibleSection({
  section,
  isCollapsed,
  pathname,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(section.defaultOpen ?? true);
  const Icon = section.icon;
  const hasActiveItem = section.items.some((item) =>
    pathname.startsWith(item.href)
  );

  // When collapsed, show only the section icon with a dropdown menu for items
  if (isCollapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  hasActiveItem
                    ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                <div className="flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {section.title}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuLabel>{section.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2",
                    isItemActive && "bg-accent",
                    item.disabled && "pointer-events-none opacity-50"
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                  <span className="flex-1">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            hasActiveItem
              ? "text-[hsl(var(--sidebar-active-foreground))]"
              : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
          )}
        >
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <span className="flex-1 text-left font-medium">{section.title}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 pt-1">
        <div className="space-y-1 border-l border-[hsl(var(--sidebar-border))] pl-3">
          {section.items.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
              isCollapsed={false}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// Main Sidebar Component
// =============================================================================

export function Sidebar({ config, className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } =
    useUIStore();

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - only transition width/transform, not colors */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] transition-[width,transform] duration-300",
          sidebarCollapsed ? "w-16" : "w-64",
          // Mobile: hidden by default, shown as overlay
          "max-md:w-64 max-md:-translate-x-full",
          mobileMenuOpen && "max-md:translate-x-0",
          className
        )}
      >
        {/* Header - logo and brand name */}
        <div className="flex h-14 items-center border-b border-[hsl(var(--sidebar-border))] px-3 gap-3">
          {/* Logo - never shrinks */}
          <div className="flex-shrink-0">
            {config.logo}
          </div>

          {/* Title - collapses to zero width */}
          {config.title && (
            <span
              className={cn(
                "font-semibold text-[hsl(var(--sidebar-foreground))] whitespace-nowrap overflow-hidden transition-all duration-300",
                sidebarCollapsed ? "opacity-0 w-0" : "opacity-100"
              )}
            >
              {config.title}
            </span>
          )}

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden flex-shrink-0 ml-auto"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {/* Main Items */}
          <div className="space-y-1">
            {config.mainItems.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                isCollapsed={sidebarCollapsed}
              />
            ))}
          </div>

          {/* Sections */}
          {config.sections && config.sections.length > 0 && (
            <div className="mt-4 space-y-4">
              {config.sections.map((section) => (
                <CollapsibleSection
                  key={section.title}
                  section={section}
                  isCollapsed={sidebarCollapsed}
                  pathname={pathname}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Bottom Items */}
        {config.bottomItems && config.bottomItems.length > 0 && (
          <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
            <div className="space-y-1">
              {config.bottomItems.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  isCollapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>
        )}

        {/* Collapse/Expand Button - Desktop only */}
        <div className="hidden md:block border-t border-[hsl(var(--sidebar-border))] p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] transition-colors"
              >
                <div className="flex-shrink-0">
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-300",
                    sidebarCollapsed ? "opacity-0 w-0" : "opacity-100"
                  )}
                >
                  Collapse
                </span>
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right" sideOffset={10}>
                Expand
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

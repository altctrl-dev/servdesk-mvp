"use client";

/**
 * Panel Container Component
 *
 * Renders the stacked panel system with animations.
 * Panels slide in from the right and stack on top of each other.
 */

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePanelStore, PANEL_WIDTHS } from "@/lib/stores/panel-store";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// =============================================================================
// Panel Header Component
// =============================================================================

interface PanelHeaderProps {
  title?: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export function PanelHeader({
  title,
  description,
  onClose,
  children,
}: PanelHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b px-6 py-4">
      <div className="flex-1">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {children}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close panel</span>
      </Button>
    </div>
  );
}

// =============================================================================
// Panel Body Component
// =============================================================================

interface PanelBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelBody({ children, className }: PanelBodyProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-6 scrollbar-thin", className)}>
      {children}
    </div>
  );
}

// =============================================================================
// Panel Footer Component
// =============================================================================

interface PanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelFooter({ children, className }: PanelFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t px-6 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Base Panel Component
// =============================================================================

interface BasePanelProps {
  width: "sm" | "md" | "lg";
  level: number;
  children: React.ReactNode;
  className?: string;
}

function BasePanel({
  width,
  level,
  children,
  className,
}: BasePanelProps) {
  const widthPx = PANEL_WIDTHS[width];

  // Calculate offset for stacking effect
  const offset = (level - 1) * 20;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 300,
      }}
      style={{
        width: widthPx,
        right: offset,
        zIndex: 50 + level * 5,
      }}
      className={cn(
        "fixed top-0 h-full bg-background border-l shadow-xl flex flex-col",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// Panel Container
// =============================================================================

interface PanelRegistry {
  [key: string]: React.ComponentType<{
    panelId: string;
    onClose: () => void;
    [key: string]: unknown;
  }>;
}

// Default empty registry - apps should provide their own
let panelRegistry: PanelRegistry = {};

export function registerPanels(panels: PanelRegistry) {
  panelRegistry = { ...panelRegistry, ...panels };
}

export function PanelContainer() {
  const { panels, closePanel, closeTopPanel, closeAllPanels } = usePanelStore();

  // Close panel on Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && panels.length > 0) {
        closeTopPanel();
      }
    },
    [panels.length, closeTopPanel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when panels are open
  useEffect(() => {
    if (panels.length > 0) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [panels.length]);

  if (panels.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {panels.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={closeAllPanels}
          />
        )}
      </AnimatePresence>

      {/* Panels */}
      <AnimatePresence mode="popLayout">
        {panels.map((panel, index) => {
          const PanelComponent = panelRegistry[panel.type];

          if (!PanelComponent) {
            console.warn(`Panel type "${panel.type}" not found in registry`);
            return null;
          }

          return (
            <BasePanel
              key={panel.id}
              width={panel.width}
              level={index + 1}
            >
              <PanelComponent
                panelId={panel.id}
                onClose={() => closePanel(panel.id)}
                {...panel.props}
              />
            </BasePanel>
          );
        })}
      </AnimatePresence>
    </>
  );
}

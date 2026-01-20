/**
 * Panel Store
 *
 * Manages stacked panel system for drill-down navigation.
 * Supports up to 3 levels of nested panels.
 */

import { create } from "zustand";

export type PanelWidth = "sm" | "md" | "lg";

export interface PanelConfig {
  id: string;
  type: string;
  props: Record<string, unknown>;
  width: PanelWidth;
}

interface PanelStore {
  panels: PanelConfig[];
  openPanel: (
    type: string,
    props?: Record<string, unknown>,
    options?: { width?: PanelWidth }
  ) => string;
  closePanel: (id: string) => void;
  closeTopPanel: () => void;
  closeAllPanels: () => void;
  updatePanelProps: (id: string, props: Record<string, unknown>) => void;
}

const MAX_PANELS = 3;

export const usePanelStore = create<PanelStore>((set, get) => ({
  panels: [],

  openPanel: (type, props = {}, options = {}) => {
    const { panels } = get();

    // Limit to MAX_PANELS
    if (panels.length >= MAX_PANELS) {
      console.warn(`Maximum of ${MAX_PANELS} panels allowed`);
      return panels[panels.length - 1].id;
    }

    const id = `panel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const width = options.width || "md";

    set((state) => ({
      panels: [...state.panels, { id, type, props, width }],
    }));

    return id;
  },

  closePanel: (id) => {
    set((state) => ({
      panels: state.panels.filter((p) => p.id !== id),
    }));
  },

  closeTopPanel: () => {
    set((state) => ({
      panels: state.panels.slice(0, -1),
    }));
  },

  closeAllPanels: () => {
    set({ panels: [] });
  },

  updatePanelProps: (id, props) => {
    set((state) => ({
      panels: state.panels.map((p) =>
        p.id === id ? { ...p, props: { ...p.props, ...props } } : p
      ),
    }));
  },
}));

// Panel width values in pixels
export const PANEL_WIDTHS: Record<PanelWidth, number> = {
  sm: 400,
  md: 600,
  lg: 800,
};

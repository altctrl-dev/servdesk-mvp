# Sidebar Collapse/Expand Implementation Guide

> **Purpose**: This document explains how the sidebar maintains fixed icon positions during collapse/expand transitions - a key UX pattern that prevents visual jarring and maintains spatial consistency.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Core Technique](#the-core-technique)
3. [State Management](#state-management)
4. [CSS Layout Strategy](#css-layout-strategy)
5. [Animation & Transitions](#animation--transitions)
6. [Text & Badge Hiding](#text--badge-hiding)
7. [Main Content Integration](#main-content-integration)
8. [Hydration Safety](#hydration-safety)
9. [Best Practices Checklist](#best-practices-checklist)
10. [File Reference](#file-reference)

---

## Architecture Overview

The sidebar uses a **three-layer approach** to keep icons stationary:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sidebar Container                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ EXPANDED (256px)                                             ││
│  │ ┌──────┐ ┌──────────────────────────┐ ┌─────┐               ││
│  │ │ Icon │ │ Label Text               │ │Badge│               ││
│  │ │ 20px │ │ flex-1 (grows)           │ │     │               ││
│  │ └──────┘ └──────────────────────────┘ └─────┘               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  ┌──────────────────────────────┐                               │
│  │ COLLAPSED (64px)             │                               │
│  │ ┌──────┐                     │                               │
│  │ │ Icon │ (text & badge w=0)  │                               │
│  │ │ 20px │                     │                               │
│  │ └──────┘                     │                               │
│  └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight**: The icon never moves. Only the sidebar container shrinks and the text/badge elements collapse to zero width.

---

## The Core Technique

### Why Icons Stay Fixed

The magic comes from three CSS properties working together:

```tsx
// NavLink item structure
<Link className="flex items-center gap-3 px-3 py-2">
  {/* 1. Icon container - NEVER shrinks */}
  <div className="relative flex-shrink-0">
    <Icon className="h-5 w-5" />
  </div>

  {/* 2. Text - collapses to zero width */}
  <span className={cn(
    "flex-1 whitespace-nowrap transition-all duration-300",
    isCollapsed ? "opacity-0 w-0" : "opacity-100"
  )}>
    {label}
  </span>

  {/* 3. Badge - also collapses to zero */}
  <span className={cn(
    isCollapsed ? "opacity-0 w-0" : "opacity-100"
  )}>
    {badge}
  </span>
</Link>
```

### The Three-Part Strategy

| Part | CSS | Behavior |
|------|-----|----------|
| **Icon** | `flex-shrink-0` | Never shrinks, stays at 20px |
| **Text** | `flex-1` + `w-0` when collapsed | Grows to fill space OR collapses |
| **Badge** | `w-0` when collapsed | Disappears without affecting icon |

### Visual Timeline

```
EXPANDED STATE (256px sidebar)
├─ [12px padding] [20px icon] [12px gap] [~180px text] [badge] [12px padding]

TRANSITION (300ms)
├─ Sidebar width: 256px → 64px
├─ Text width: 180px → 0px (with opacity fade)
├─ Badge width: auto → 0px (with opacity fade)
├─ Icon: UNCHANGED (still 20px, still at same position)

COLLAPSED STATE (64px sidebar)
├─ [12px padding] [20px icon] [12px gap] [0px text] [0px badge] [12px padding]
└─ Total: 12 + 20 + 12 + 0 + 0 + 12 = 56px (fits in 64px)
```

---

## State Management

### Zustand Store (`lib/stores/ui-version-store.ts`)

```typescript
interface UIVersionState {
  // Per-theme sidebar states (allows different states per theme)
  sidebarCollapsedV1: boolean;
  sidebarCollapsedV2: boolean;
  sidebarCollapsedV3: boolean;  // Modern theme

  // Getters/setters for current theme
  getCurrentSidebarCollapsed: () => boolean;
  setCurrentSidebarCollapsed: (collapsed: boolean) => void;
  toggleCurrentSidebar: () => void;
}
```

### Persistence

```typescript
persist(
  (set, get) => ({
    // ... state
  }),
  {
    name: 'paylog-ui-preferences',  // localStorage key
    version: 3,
    // ... migrations
  }
)
```

**Stored in**: `localStorage['paylog-ui-preferences']`

### Usage in Components

```typescript
// In sidebar.tsx
const { getCurrentSidebarCollapsed, toggleCurrentSidebar } = useUIVersion();
const isCollapsed = mounted ? getCurrentSidebarCollapsed() : false;

// Toggle button
<button onClick={toggleCurrentSidebar}>
  {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
</button>
```

---

## CSS Layout Strategy

### Sidebar Container

```tsx
// sidebar.tsx
<aside
  className={cn(
    // Fixed positioning
    "fixed left-0 top-0 z-40 h-screen",
    // Flexbox column layout
    "flex flex-col",
    // Background and border
    "bg-background border-r border-border",
    // Responsive width
    isCollapsed ? "w-16" : "w-60",
    // Smooth transitions
    transitionsEnabled && "transition-all duration-300 ease-in-out",
    // Hide on mobile
    "hidden md:flex"
  )}
>
```

### Width Values

| State | Tailwind | Pixels | CSS Variable |
|-------|----------|--------|--------------|
| Expanded | `w-60` | 240px | `--sidebar-width-expanded: 256px` |
| Collapsed | `w-16` | 64px | `--sidebar-width-collapsed: 64px` |

### CSS Variables (`globals.css`)

```css
.theme-modern {
  /* Sidebar widths */
  --sidebar-width-expanded: 256px;
  --sidebar-width-collapsed: 64px;

  /* Transition duration */
  --transition-sidebar: 300ms;
}
```

### Nav Item Layout

```tsx
// Each navigation item
<Link
  className={cn(
    // Flexbox row with gap
    "flex items-center gap-3",
    // Padding (ensures icon has space)
    "px-3 py-2",
    // Full width
    "w-full",
    // Rounded corners
    "rounded-lg",
    // Hover state
    "hover:bg-accent"
  )}
>
```

---

## Animation & Transitions

### Transition Properties

```css
/* globals.css */
.sidebar-transition {
  transition-property: width, transform, opacity;
  transition-duration: var(--transition-sidebar, 300ms);
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Applied Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Sidebar | `width` | 300ms | ease-in-out |
| Text | `opacity`, `width` | 300ms | ease-in-out |
| Badge | `opacity`, `width` | 300ms | ease-in-out |
| Main Content | `margin-left` | 300ms | ease-in-out |

### Transition Classes

```tsx
// Sidebar container
className={cn(
  transitionsEnabled && "transition-all duration-300 ease-in-out"
)}

// Text element
className={cn(
  "transition-all duration-300",
  isCollapsed ? "opacity-0 w-0" : "opacity-100"
)}
```

---

## Text & Badge Hiding

### Text Collapse

```tsx
<span
  className={cn(
    // Always present classes
    "flex-1",              // Grows to fill space
    "whitespace-nowrap",   // Prevents text wrapping
    "overflow-hidden",     // Hides overflow during transition
    "transition-all duration-300",

    // Conditional classes
    isCollapsed
      ? "opacity-0 w-0"    // Invisible + no width
      : "opacity-100"      // Visible + natural width
  )}
>
  {item.label}
</span>
```

### Badge Collapse

```tsx
{badgeCount > 0 && (
  <span
    className={cn(
      // Base styling
      "flex h-5 min-w-[20px] items-center justify-center",
      "rounded-full bg-blue-500/20 px-1.5 text-xs",
      "transition-all duration-300",

      // Conditional
      isCollapsed
        ? "opacity-0 w-0 min-w-0 px-0"  // Collapse everything
        : "opacity-100"
    )}
  >
    {badgeCount > 99 ? '99+' : badgeCount}
  </span>
)}
```

### Why `w-0` AND `opacity-0`?

- **`opacity-0`**: Makes content invisible immediately
- **`w-0`**: Removes the space the element occupied
- **Together**: Clean collapse without leaving gaps

---

## Main Content Integration

### Layout Wrapper (`layout-wrapper.tsx`)

```tsx
<div
  data-main-content
  className={cn(
    "flex flex-col min-h-screen",
    // Margin transition
    transitionsEnabled && "transition-[margin] duration-300 ease-in-out",
    // Responsive margin
    "md:ml-60",                    // Default: sidebar expanded
    isCollapsed && "md:ml-16"      // When collapsed
  )}
>
  {children}
</div>
```

### Content Width Adjustment

```tsx
// Inner content container
<div className={cn(
  "mx-auto w-full px-4 md:px-6",
  transitionsEnabled && "transition-[max-width] duration-300",
  isCollapsed
    ? "max-w-[1500px]"   // More space when sidebar collapsed
    : "max-w-[1350px]"   // Less space when sidebar expanded
)}>
  {children}
</div>
```

### Visual Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ EXPANDED LAYOUT                                                   │
│ ┌─────────┐┌────────────────────────────────────────────────────┐│
│ │ Sidebar ││              Main Content                          ││
│ │  256px  ││              ml-60 (240px margin)                  ││
│ │         ││              max-w-1350px                          ││
│ └─────────┘└────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ COLLAPSED LAYOUT                                                  │
│ ┌───┐┌──────────────────────────────────────────────────────────┐│
│ │ S ││                    Main Content                          ││
│ │64 ││                    ml-16 (64px margin)                   ││
│ │px ││                    max-w-1500px                          ││
│ └───┘└──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Hydration Safety

### The Problem

Without hydration safety:
1. Server renders with `isCollapsed = false` (expanded)
2. Client hydrates with `isCollapsed = true` (from localStorage)
3. **Flash!** Sidebar instantly jumps from expanded to collapsed

### The Solution

```tsx
// sidebar.tsx
const [mounted, setMounted] = React.useState(false);
const [transitionsEnabled, setTransitionsEnabled] = React.useState(false);

React.useEffect(() => {
  setMounted(true);
  // Enable transitions after 50ms to prevent initial animation
  const timer = setTimeout(() => setTransitionsEnabled(true), 50);
  return () => clearTimeout(timer);
}, []);

// Use false (expanded) during SSR, actual state after hydration
const isCollapsed = mounted ? getCurrentSidebarCollapsed() : false;
```

### Timeline

```
1. Server Render
   └── mounted=false → isCollapsed=false → Sidebar expanded

2. Client Hydrate
   └── mounted=false → isCollapsed=false → Sidebar still expanded
   └── No mismatch! ✓

3. useEffect Runs
   └── mounted=true → isCollapsed=actual state
   └── transitionsEnabled=false → No animation yet

4. After 50ms
   └── transitionsEnabled=true → Animations enabled
   └── Future toggles will animate smoothly
```

### CSS Fade-In Prevention

```css
/* globals.css */
[data-layout-wrapper] {
  opacity: 0;
  transition: opacity 0.15s ease-out;
}
[data-layout-wrapper].hydrated {
  opacity: 1;
}
```

This hides the entire layout until React hydrates, preventing any visible flash.

---

## Best Practices Checklist

### For Fixed Icon Positioning

- [ ] Use `flex-shrink-0` on icon container
- [ ] Set fixed dimensions on icons (`h-5 w-5`)
- [ ] Use `flex items-center gap-3` on parent
- [ ] Collapse text with `w-0 opacity-0`, not by removing from DOM
- [ ] Never transform or translate the icon itself

### For Smooth Transitions

- [ ] Use `transition-all duration-300` on sidebar
- [ ] Use `transition-[margin]` on main content
- [ ] Match transition durations across all elements
- [ ] Disable transitions initially with `transitionsEnabled` state
- [ ] Use `ease-in-out` for natural feel

### For Hydration Safety

- [ ] Use `mounted` state pattern
- [ ] Delay `transitionsEnabled` by ~50ms
- [ ] Default to expanded state during SSR
- [ ] Add `suppressHydrationWarning` where needed

### For State Persistence

- [ ] Use Zustand with persist middleware
- [ ] Store per-theme sidebar states if supporting multiple themes
- [ ] Handle localStorage access in try-catch
- [ ] Include state migrations for version updates

---

## File Reference

| File | Purpose | Key Lines |
|------|---------|-----------|
| `components/v3/layout/sidebar.tsx` | Main sidebar component | 88-165 (NavLink), 299-366 (main) |
| `lib/stores/ui-version-store.ts` | Zustand state store | 37-138 |
| `app/globals.css` | CSS variables & transitions | 222-230, 723-727 |
| `components/v3/layout/layout-wrapper.tsx` | Main content wrapper | 77-123 |
| `tailwind.config.ts` | Tailwind configuration | 96-106 |

---

## Code Templates

### Basic Nav Item (Copy-Paste Ready)

```tsx
interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isCollapsed: boolean;
  badge?: number;
}

function NavItem({ icon: Icon, label, href, isCollapsed, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"
    >
      {/* Icon - NEVER shrinks */}
      <div className="relative flex-shrink-0">
        <Icon className="h-5 w-5" />
      </div>

      {/* Label - collapses when sidebar is collapsed */}
      <span
        className={cn(
          "flex-1 whitespace-nowrap overflow-hidden transition-all duration-300",
          isCollapsed ? "opacity-0 w-0" : "opacity-100"
        )}
      >
        {label}
      </span>

      {/* Badge - also collapses */}
      {badge && badge > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-[20px] items-center justify-center rounded-full",
            "bg-primary/20 text-primary text-xs transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 min-w-0" : "opacity-100"
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
```

### Collapsed State Tooltip

```tsx
// When collapsed, show tooltip on hover
{isCollapsed ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <NavItem ... />
    </TooltipTrigger>
    <TooltipContent side="right">
      {label}
    </TooltipContent>
  </Tooltip>
) : (
  <NavItem ... />
)}
```

---

## Summary

The sidebar keeps icons fixed during collapse/expand by:

1. **Never moving the icon** - It uses `flex-shrink-0` to prevent shrinking
2. **Collapsing text to zero width** - Using `w-0 opacity-0` transitions
3. **Syncing all transitions** - 300ms across sidebar, text, and main content
4. **Preventing hydration flash** - Using `mounted` state pattern

This creates a professional UX where users can track menu items by icon position, even when the sidebar changes width.

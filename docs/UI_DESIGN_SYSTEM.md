# ServDesk UI Design System

> Modern SaaS helpdesk UI architecture and design system documentation.
> Blueprint for transforming ServDesk into a world-class support platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Philosophy](#2-design-philosophy)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Layout Architecture](#5-layout-architecture)
6. [Theme System](#6-theme-system)
7. [Design Tokens](#7-design-tokens)
8. [Component Library](#8-component-library)
9. [Page Designs](#9-page-designs)
10. [Panel System](#10-panel-system)
11. [Responsive Design](#11-responsive-design)
12. [Animations & Micro-interactions](#12-animations--micro-interactions)
13. [Accessibility](#13-accessibility)
14. [Helpdesk-Specific Patterns](#14-helpdesk-specific-patterns)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. Overview

ServDesk is a modern helpdesk/ticketing system designed for support teams. The UI should embody:

- **Efficiency**: Support agents handle hundreds of tickets daily - every click matters
- **Clarity**: Quick visual scanning of ticket status, priority, and context
- **Focus**: Minimize distractions, maximize productivity
- **Delight**: Smooth interactions that make work enjoyable

### Current State vs Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Theme | Basic Shadcn defaults | Custom brand-aligned design system |
| Layout | Fixed sidebar | Collapsible sidebar with persistence |
| Panels | Modal dialogs | Stacked panel system (MS 365 style) |
| Animations | Minimal | Purposeful micro-interactions |
| Dark Mode | Basic toggle | Polished dark-first design |
| Mobile | Basic responsive | Mobile-optimized agent experience |

---

## 2. Design Philosophy

### Core Principles

1. **Inbox Zero Mentality**
   - Design for workflow, not just display
   - Quick actions should be within 1-2 clicks
   - Keyboard shortcuts for power users

2. **Information Hierarchy**
   - Most important info visible at a glance
   - Progressive disclosure for details
   - Color-coded status indicators

3. **Context Preservation**
   - Stacked panels keep previous context visible
   - Breadcrumb navigation
   - Persistent filters and preferences

4. **Performance First**
   - Optimistic UI updates
   - Skeleton loading states
   - Virtualized lists for large datasets

5. **Consistency**
   - Same patterns across all pages
   - Predictable component behavior
   - Unified design tokens

### Inspiration Sources

- **Intercom** - Conversation-first inbox design
- **Zendesk** - Agent workspace efficiency
- **Linear** - Keyboard-driven, minimal UI
- **Notion** - Panel-based navigation
- **Microsoft 365** - Stacked panel pattern

---

## 3. Tech Stack

### Current Stack (Keep)

| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS 3.4 | Utility-first styling |
| Shadcn/ui | Component primitives |
| Radix UI | Accessible headless components |
| Lucide React | Icon library |
| React Hook Form | Form management |
| Zod | Schema validation |

### Additions for UI Enhancement

| Technology | Purpose | Priority |
|------------|---------|----------|
| next-themes | Theme switching with SSR support | High |
| Zustand | UI state (sidebar, panels, preferences) | High |
| Framer Motion | Animations and transitions | Medium |
| Sonner | Toast notifications (replace current) | Medium |
| cmdk | Command palette (Cmd+K) | Medium |
| Recharts | Analytics charts | Low |

---

## 4. Project Structure

### Proposed Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth pages (login, forgot-password)
│   ├── (dashboard)/               # Protected routes
│   │   ├── dashboard/             # Main dashboard/inbox
│   │   ├── tickets/               # Ticket list and detail
│   │   ├── customers/             # Customer management (future)
│   │   ├── reports/               # Analytics (future)
│   │   ├── admin/                 # Admin section
│   │   │   └── users/             # User management
│   │   ├── settings/              # User settings
│   │   └── layout.tsx             # Dashboard layout
│   ├── track/                     # Public ticket tracking
│   ├── globals.css                # Design tokens & global styles
│   └── layout.tsx                 # Root layout
│
├── components/
│   ├── ui/                        # Shadcn/ui primitives (enhanced)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ... (existing + new)
│   │
│   ├── layout/                    # Layout components (NEW)
│   │   ├── sidebar.tsx            # Collapsible sidebar
│   │   ├── navbar.tsx             # Top navigation bar
│   │   ├── layout-wrapper.tsx     # Layout orchestrator
│   │   ├── command-palette.tsx    # Cmd+K search
│   │   └── breadcrumbs.tsx        # Navigation breadcrumbs
│   │
│   ├── panels/                    # Panel system (NEW)
│   │   ├── panel-provider.tsx     # Panel context
│   │   ├── panel-container.tsx    # Panel stack renderer
│   │   └── panel-level.tsx        # Individual panel
│   │
│   ├── tickets/                   # Ticket-specific components
│   │   ├── ticket-list.tsx        # Virtualized ticket list
│   │   ├── ticket-card.tsx        # Ticket preview card
│   │   ├── ticket-detail.tsx      # Full ticket view
│   │   ├── message-thread.tsx     # Conversation thread
│   │   ├── reply-composer.tsx     # Rich reply editor
│   │   ├── ticket-sidebar.tsx     # Ticket metadata panel
│   │   ├── status-badge.tsx       # Status indicator
│   │   ├── priority-badge.tsx     # Priority indicator
│   │   └── quick-actions.tsx      # Action buttons
│   │
│   ├── customers/                 # Customer components (future)
│   │
│   ├── admin/                     # Admin components
│   │   ├── user-table.tsx
│   │   ├── invite-dialog.tsx
│   │   └── role-badge.tsx
│   │
│   ├── dashboard/                 # Dashboard widgets
│   │   ├── stats-cards.tsx
│   │   ├── activity-feed.tsx
│   │   └── quick-actions.tsx
│   │
│   └── providers/                 # React providers
│       ├── theme-provider.tsx
│       └── panel-provider.tsx
│
├── lib/
│   ├── stores/                    # Zustand stores (NEW)
│   │   ├── ui-store.ts            # Sidebar, theme preferences
│   │   └── panel-store.ts         # Panel stack state
│   ├── utils/
│   │   └── cn.ts                  # Class name utility
│   └── hooks/                     # Custom hooks
│       ├── use-keyboard-shortcuts.ts
│       └── use-media-query.ts
│
└── types/                         # TypeScript definitions
```

### File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `ticket-detail.tsx`)
- **Stores**: `kebab-case-store.ts` (e.g., `ui-store.ts`)
- **Hooks**: `use-kebab-case.ts` (e.g., `use-keyboard-shortcuts.ts`)
- **Types**: `kebab-case.ts` (e.g., `ticket-types.ts`)

---

## 5. Layout Architecture

### Layout Stack

```
┌─────────────────────────────────────────────────────────────┐
│ Root Layout (app/layout.tsx)                                │
│ ├── ThemeProvider (next-themes)                             │
│ └── SessionProvider                                         │
│     └── Dashboard Layout (app/(dashboard)/layout.tsx)       │
│         └── LayoutWrapper                                   │
│             ├── Sidebar (fixed left, collapsible)           │
│             ├── Navbar (sticky top)                         │
│             ├── Main Content (scrollable)                   │
│             ├── CommandPalette (Cmd+K overlay)              │
│             └── PanelProvider (stacked panels)              │
└─────────────────────────────────────────────────────────────┘
```

### Layout Measurements

```
┌──────────────────────────────────────────────────────────────────┐
│ NAVBAR (sticky, h-14 / 56px)                                     │
│ ┌──────┬─────────────────────────────────────────────────────────┤
│ │ Logo │  Breadcrumbs              [Search ⌘K] [Theme] [Avatar] │
├────────┴─────────────────────────────────────────────────────────┤
│          │                                                       │
│ SIDEBAR  │              MAIN CONTENT AREA                        │
│          │                                                       │
│ Expanded:│     Max-width: 1400px (centered)                      │
│ w-64     │     Padding: px-6 py-6                                │
│ (256px)  │                                                       │
│          │     ┌─────────────────────────────────────────────┐   │
│ Collapsed│     │  Ticket List         │  Ticket Detail      │   │
│ w-16     │     │  (flex-1, min 400px) │  (flex-1, min 500px)│   │
│ (64px)   │     │                      │                     │   │
│          │     │                      │                     │   │
│ Fixed    │     └─────────────────────────────────────────────┘   │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

### Sidebar Navigation Structure

```tsx
const NAVIGATION = {
  main: [
    { icon: Inbox, label: 'Inbox', href: '/dashboard', badge: 12 },
    { icon: Ticket, label: 'All Tickets', href: '/dashboard/tickets' },
    { icon: Users, label: 'Customers', href: '/dashboard/customers', future: true },
    { icon: BarChart3, label: 'Reports', href: '/dashboard/reports', future: true },
  ],
  admin: [
    { icon: UserCog, label: 'Users', href: '/dashboard/admin/users', requiredRole: 'SUPER_ADMIN' },
  ],
  bottom: [
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ],
};
```

### Navbar Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] [Logo]  Dashboard > Tickets > #TKT-0001   [🔍 ⌘K] [🌙] [👤]│
└─────────────────────────────────────────────────────────────────┘
  │     │            │                              │     │    │
  │     │            └─ Breadcrumbs (dynamic)       │     │    └─ User menu
  │     └─ App logo/name                            │     └─ Theme toggle
  │                                                 └─ Command palette trigger
  └─ Mobile menu toggle (md:hidden)
```

---

## 6. Theme System

### Theme Architecture

Use `next-themes` with CSS custom properties for seamless light/dark switching:

```tsx
// components/providers/theme-provider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
```

### FOUC Prevention

Add to `app/layout.tsx` head:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (theme === 'dark' || (!theme && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      })();
    `,
  }}
/>
```

### Theme Toggle Component

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## 7. Design Tokens

### Color System (HSL Format)

Update `globals.css`:

```css
@layer base {
  :root {
    /* =========================================================
       SERVDESK DESIGN TOKENS - LIGHT MODE
       ========================================================= */

    /* Core Colors */
    --background: 0 0% 100%;           /* Pure white */
    --foreground: 222 47% 11%;         /* Dark navy for text */
    --surface: 210 40% 98%;            /* Slight blue-gray tint */

    /* Card & Popover */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Primary - Brand Blue */
    --primary: 217 91% 60%;            /* Vibrant blue */
    --primary-foreground: 0 0% 100%;

    /* Secondary */
    --secondary: 220 14% 96%;
    --secondary-foreground: 222 47% 11%;

    /* Muted */
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;

    /* Accent */
    --accent: 220 14% 96%;
    --accent-foreground: 222 47% 11%;

    /* Destructive */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    /* Success */
    --success: 142 72% 40%;
    --success-foreground: 0 0% 100%;

    /* Warning */
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;

    /* Info */
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;

    /* Borders & Inputs */
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 217 91% 60%;

    /* Sidebar */
    --sidebar: 0 0% 100%;
    --sidebar-foreground: 222 47% 11%;
    --sidebar-border: 220 13% 91%;
    --sidebar-muted: 220 14% 96%;
    --sidebar-hover: 220 14% 93%;
    --sidebar-active: 217 91% 95%;
    --sidebar-active-foreground: 217 91% 45%;

    /* Ticket Status Colors */
    --status-new: 217 91% 60%;         /* Blue */
    --status-open: 38 92% 50%;         /* Orange */
    --status-pending: 263 70% 50%;     /* Purple */
    --status-resolved: 142 72% 40%;    /* Green */
    --status-closed: 220 9% 46%;       /* Gray */

    /* Priority Colors */
    --priority-urgent: 0 84% 60%;      /* Red */
    --priority-high: 27 96% 61%;       /* Orange */
    --priority-medium: 38 92% 50%;     /* Amber */
    --priority-low: 220 9% 46%;        /* Gray */

    /* Radius */
    --radius: 0.625rem;                /* 10px - slightly larger */

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }

  .dark {
    /* =========================================================
       SERVDESK DESIGN TOKENS - DARK MODE
       ========================================================= */

    /* Core Colors */
    --background: 224 71% 4%;          /* Very dark navy */
    --foreground: 210 20% 98%;         /* Off-white */
    --surface: 222 47% 11%;            /* Dark navy */

    /* Card & Popover */
    --card: 222 47% 11%;
    --card-foreground: 210 20% 98%;
    --popover: 222 47% 11%;
    --popover-foreground: 210 20% 98%;

    /* Primary - Brand Blue (slightly lighter in dark) */
    --primary: 217 91% 65%;
    --primary-foreground: 222 47% 11%;

    /* Secondary */
    --secondary: 217 19% 17%;
    --secondary-foreground: 210 20% 98%;

    /* Muted */
    --muted: 217 19% 17%;
    --muted-foreground: 215 20% 65%;

    /* Accent */
    --accent: 217 19% 17%;
    --accent-foreground: 210 20% 98%;

    /* Destructive */
    --destructive: 0 62% 50%;
    --destructive-foreground: 210 20% 98%;

    /* Success */
    --success: 142 69% 45%;
    --success-foreground: 210 20% 98%;

    /* Warning */
    --warning: 38 92% 50%;
    --warning-foreground: 222 47% 11%;

    /* Info */
    --info: 217 91% 65%;
    --info-foreground: 222 47% 11%;

    /* Borders & Inputs */
    --border: 217 19% 17%;
    --input: 217 19% 17%;
    --ring: 217 91% 65%;

    /* Sidebar */
    --sidebar: 224 71% 4%;
    --sidebar-foreground: 210 20% 98%;
    --sidebar-border: 217 19% 17%;
    --sidebar-muted: 217 19% 17%;
    --sidebar-hover: 217 19% 20%;
    --sidebar-active: 217 91% 15%;
    --sidebar-active-foreground: 217 91% 68%;

    /* Shadows - Stronger for dark mode */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
  }
}
```

### Typography Scale

```css
:root {
  /* Font Family */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

### Spacing System

Stick with Tailwind's default spacing (4px base):

| Class | Value | Use Case |
|-------|-------|----------|
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Icon gaps, small padding |
| `space-3` | 12px | Compact list items |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large gaps |
| `space-12` | 48px | Page sections |

### Layout Variables

```css
:root {
  --sidebar-width-expanded: 256px;   /* w-64 */
  --sidebar-width-collapsed: 64px;   /* w-16 */
  --navbar-height: 56px;             /* h-14 */
  --panel-width-sm: 400px;
  --panel-width-md: 600px;
  --panel-width-lg: 800px;

  /* Transitions */
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
  --transition-theme: 500ms;
}
```

---

## 8. Component Library

### Enhanced UI Components

Enhance existing Shadcn components:

| Component | Enhancements |
|-----------|--------------|
| **Button** | Add `success`, `warning` variants; loading state with spinner |
| **Badge** | Add status/priority color variants |
| **Card** | Add hover states, clickable variant |
| **Input** | Add icon slots (left/right) |
| **Select** | Add search/filter capability |
| **Table** | Add sortable headers, row selection |
| **Skeleton** | Add more variations (card, list item, avatar) |

### New Components Needed

| Component | Purpose |
|-----------|---------|
| **Sidebar** | Collapsible navigation with tooltips |
| **Navbar** | Top bar with breadcrumbs, search, user menu |
| **CommandPalette** | Cmd+K search and quick actions |
| **Panel** | Slide-in detail panels |
| **EmptyState** | Illustrated empty states |
| **LoadingState** | Full-page/section loading |
| **AvatarGroup** | Stacked avatars for assignees |
| **StatusBadge** | Ticket status with colors |
| **PriorityBadge** | Priority with colors/icons |
| **RelativeTime** | "2 hours ago" timestamps |
| **Kbd** | Keyboard shortcut display |

### Button Variants

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### Status Badge Component

```tsx
// components/ui/status-badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        OPEN: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        PENDING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
    },
    defaultVariants: {
      status: 'NEW',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {status}
    </span>
  );
}
```

---

## 9. Page Designs

### Dashboard / Inbox

The primary workspace for agents:

```
┌────────────────────────────────────────────────────────────────────┐
│ STATS BAR                                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│ │ New: 12  │ │ Open: 45 │ │ Pending: │ │ Resolved:│               │
│ │ ↑ 3 today│ │          │ │ 8        │ │ 23 today │               │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
├────────────────────────────────────────────────────────────────────┤
│ FILTER BAR                                                         │
│ [All ▾] [Status ▾] [Priority ▾] [Assigned ▾]    [🔍 Search...]    │
├────────────────────────────────────────────────────────────────────┤
│ TICKET LIST (scrollable)                 │ TICKET DETAIL           │
│ ┌──────────────────────────────────────┐ │ ┌─────────────────────┐ │
│ │ ● #TKT-0042 - Payment issue     🔴  │ │ │ #TKT-0042           │ │
│ │   john@example.com • 2h ago         │ │ │ Payment not working │ │
│ │   "I tried to pay but..."           │◀─┤ │                     │ │
│ ├──────────────────────────────────────┤ │ │ [Customer Info]     │ │
│ │ ○ #TKT-0041 - Login problem    🟠   │ │ │ [Conversation]      │ │
│ │   jane@example.com • 4h ago         │ │ │ [Reply Composer]    │ │
│ ├──────────────────────────────────────┤ │ │                     │ │
│ │ ○ #TKT-0040 - Feature request  🟢   │ │ │ [Actions]           │ │
│ │   bob@example.com • 1d ago          │ │ └─────────────────────┘ │
│ └──────────────────────────────────────┘ │                         │
└────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Split view: list + detail side-by-side
- Real-time badge counts
- Quick status indicators (colored dots)
- Keyboard navigation (↑↓ to select, Enter to open)
- Unread indicator styling

### Ticket Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                              │
│ ← Back    #TKT-0042: Payment not working    [Status ▾] [Actions ▾] │
├─────────────────────────────────────────────────────────────────────┤
│ MAIN CONTENT                              │ SIDEBAR                 │
│ ┌───────────────────────────────────────┐ │ ┌─────────────────────┐ │
│ │ MESSAGE THREAD                        │ │ │ TICKET INFO         │ │
│ │                                       │ │ │ Status: Open        │ │
│ │ ┌─────────────────────────────────┐   │ │ │ Priority: High      │ │
│ │ │ 👤 John Doe • 2 hours ago       │   │ │ │ Assigned: Jane      │ │
│ │ │ I tried to process payment but  │   │ │ │ Created: Jan 20     │ │
│ │ │ it keeps showing an error...    │   │ │ │                     │ │
│ │ └─────────────────────────────────┘   │ │ ├─────────────────────┤ │
│ │                                       │ │ │ CUSTOMER            │ │
│ │ ┌─────────────────────────────────┐   │ │ │ 👤 John Doe         │ │
│ │ │ 👩 Jane (Agent) • 1 hour ago    │   │ │ │ john@example.com    │ │
│ │ │ Thanks for reaching out! Can    │   │ │ │ 5 previous tickets  │ │
│ │ │ you share a screenshot?         │   │ │ └─────────────────────┘ │
│ │ └─────────────────────────────────┘   │ │ ┌─────────────────────┐ │
│ │                                       │ │ │ TIMELINE            │ │
│ │                                       │ │ │ Created: 2h ago     │ │
│ │                                       │ │ │ First reply: 1h ago │ │
│ └───────────────────────────────────────┘ │ └─────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ REPLY COMPOSER                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Reply ▾] [Note]                                                │ │
│ │                                                                 │ │
│ │ Type your reply...                                              │ │
│ │                                                                 │ │
│ │ [B] [I] [Link] [Code] [List]                    [Send Reply →] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### User Management (Admin)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                              │
│ Users                                          [+ Invite User]      │
├─────────────────────────────────────────────────────────────────────┤
│ TABS                                                                │
│ [Active Users (5)] [Pending Invitations (2)]                        │
├─────────────────────────────────────────────────────────────────────┤
│ TABLE                                                               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ USER              │ EMAIL              │ ROLE    │ STATUS │ ⋮  │ │
│ ├───────────────────┼────────────────────┼─────────┼────────┼────┤ │
│ │ 👤 Jane Smith     │ jane@company.com   │ Admin   │ Active │ ⋮  │ │
│ │ 👤 Bob Johnson    │ bob@company.com    │ Agent   │ Active │ ⋮  │ │
│ │ 👤 Alice Chen     │ alice@company.com  │ Agent   │ Active │ ⋮  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Panel System

### Architecture

Microsoft 365-style stacked panels for drill-down navigation:

```
┌────────────────────────────────────────────────────────────────────┐
│                         Main Content                               │
├────────────────────────────────────────────────────────────────────┤
│                                          ┌─────────────────────────┤
│                                          │      PANEL LEVEL 1      │
│                                          │   (z-index: 50)         │
│                                          │   width: 600px          │
│                                          │         ┌───────────────┤
│                                          │         │  PANEL LVL 2  │
│                                          │         │ (z-index: 55) │
│                                          │         │ width: 500px  │
│                                          │         │      ┌────────┤
│                                          │         │      │LVL 3   │
│                                          │         │      │(z:60)  │
└────────────────────────────────────────────────────────────────────┘
```

### Panel Store (Zustand)

```tsx
// lib/stores/panel-store.ts
import { create } from 'zustand';

interface PanelConfig {
  id: string;
  type: string;
  props: Record<string, unknown>;
  width?: 'sm' | 'md' | 'lg';
}

interface PanelStore {
  panels: PanelConfig[];
  openPanel: (type: string, props?: object, options?: { width?: 'sm' | 'md' | 'lg' }) => string;
  closePanel: (id: string) => void;
  closeTopPanel: () => void;
  closeAllPanels: () => void;
}

export const usePanelStore = create<PanelStore>((set, get) => ({
  panels: [],

  openPanel: (type, props = {}, options = {}) => {
    const id = `panel-${Date.now()}`;
    set((state) => ({
      panels: [...state.panels, { id, type, props, width: options.width || 'md' }],
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
}));
```

### Panel Widths

```tsx
const PANEL_WIDTHS = {
  sm: 400,   // Quick actions, confirmations
  md: 600,   // Standard detail views
  lg: 800,   // Complex forms, large content
};
```

### Usage Example

```tsx
import { usePanelStore } from '@/lib/stores/panel-store';

function TicketList() {
  const { openPanel } = usePanelStore();

  const handleViewCustomer = (customerId: string) => {
    openPanel('customer-detail', { customerId }, { width: 'md' });
  };

  return (
    <button onClick={() => handleViewCustomer('123')}>
      View Customer
    </button>
  );
}
```

---

## 11. Responsive Design

### Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| `xs` | 0-639px | Single column, bottom nav, full-width panels |
| `sm` | 640-767px | Single column, side nav hidden |
| `md` | 768-1023px | **Key**: Sidebar visible, split view |
| `lg` | 1024-1279px | Full layout |
| `xl` | 1280px+ | Extended content area |

### Mobile Adaptations

```tsx
// Mobile: Stack layout, bottom sheet panels
// Desktop: Split view, slide-in panels

<div className="flex flex-col md:flex-row">
  {/* Ticket list: full width on mobile, 40% on desktop */}
  <div className="w-full md:w-2/5 md:border-r">
    <TicketList />
  </div>

  {/* Ticket detail: hidden on mobile until selected */}
  <div className="hidden md:block md:w-3/5">
    <TicketDetail />
  </div>
</div>
```

### Mobile Navigation

```tsx
// Mobile: Bottom navigation bar
<nav className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t">
  <div className="flex justify-around py-2">
    <NavItem icon={Inbox} label="Inbox" href="/dashboard" />
    <NavItem icon={Ticket} label="Tickets" href="/dashboard/tickets" />
    <NavItem icon={Settings} label="Settings" href="/dashboard/settings" />
  </div>
</nav>
```

---

## 12. Animations & Micro-interactions

### Transition Utilities

```css
/* Add to globals.css */
@layer utilities {
  .transition-smooth {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }

  .transition-fast {
    transition-duration: 150ms;
  }

  .transition-slow {
    transition-duration: 300ms;
  }
}
```

### Micro-interactions

```css
/* Button press effect */
.btn-press:active {
  transform: scale(0.97);
}

/* Card hover lift */
.hover-lift {
  transition: transform 200ms, box-shadow 200ms;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* List item selection */
.list-item-select {
  transition: background-color 150ms;
}
.list-item-select:hover {
  background-color: hsl(var(--muted));
}
.list-item-select[data-selected="true"] {
  background-color: hsl(var(--primary) / 0.1);
}
```

### Panel Animations (Framer Motion)

```tsx
import { motion, AnimatePresence } from 'framer-motion';

function Panel({ isOpen, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[600px] bg-background z-50 shadow-xl"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Loading States

```tsx
// Skeleton for ticket list
function TicketListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 13. Accessibility

### Keyboard Navigation

```tsx
// Global keyboard shortcuts
const SHORTCUTS = {
  'g h': () => router.push('/dashboard'),           // Go to home
  'g t': () => router.push('/dashboard/tickets'),   // Go to tickets
  'g s': () => router.push('/dashboard/settings'),  // Go to settings
  'c': () => openCreateTicketDialog(),              // Create ticket
  '/': () => focusSearch(),                         // Focus search
  'Escape': () => closeTopPanel(),                  // Close panel
};
```

### Focus Management

```css
/* Visible focus rings for keyboard users */
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Remove focus ring for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### ARIA Implementation

```tsx
// Ticket list with proper ARIA
<div role="listbox" aria-label="Ticket list">
  {tickets.map((ticket) => (
    <div
      key={ticket.id}
      role="option"
      aria-selected={selectedId === ticket.id}
      tabIndex={0}
    >
      {/* Ticket content */}
    </div>
  ))}
</div>

// Status badge with screen reader text
<StatusBadge status="OPEN">
  <span className="sr-only">Status: </span>
  Open
</StatusBadge>
```

### Color Contrast

- All text: WCAG AA compliant (4.5:1 ratio minimum)
- Interactive elements: 3:1 contrast ratio
- Status colors: Distinguishable for colorblind users (use icons as secondary indicators)

---

## 14. Helpdesk-Specific Patterns

### Ticket Status Flow

```
NEW → OPEN → PENDING → RESOLVED → CLOSED
 │      │       │          │
 │      │       │          └── Can reopen → OPEN
 │      │       └── Customer responds → OPEN
 │      └── Agent responds → PENDING (optional)
 └── Agent picks up → OPEN
```

### Quick Actions

```tsx
// Ticket quick actions (always visible)
const QUICK_ACTIONS = [
  { icon: CheckCircle, label: 'Resolve', action: 'resolve', variant: 'success' },
  { icon: Clock, label: 'Snooze', action: 'snooze' },
  { icon: UserPlus, label: 'Assign', action: 'assign' },
  { icon: Tag, label: 'Tag', action: 'tag' },
];
```

### Canned Responses

```tsx
// Quick insert canned responses
function CannedResponsePicker({ onSelect }) {
  const responses = [
    { id: 1, title: 'Greeting', content: 'Hi {{customer.name}}, thanks for reaching out!' },
    { id: 2, title: 'Need more info', content: 'Could you please provide more details about...' },
    { id: 3, title: 'Resolved', content: 'Great news! This issue has been resolved...' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Canned
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {responses.map((response) => (
          <DropdownMenuItem key={response.id} onClick={() => onSelect(response.content)}>
            {response.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Customer Context

```tsx
// Show customer history in sidebar
function CustomerContext({ customerId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">John Doe</p>
            <p className="text-sm text-muted-foreground">john@example.com</p>
          </div>
        </div>

        <Separator />

        <div className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Total tickets:</span> 5</p>
          <p><span className="text-muted-foreground">Last contact:</span> 2 days ago</p>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          View all tickets
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Install dependencies (next-themes, zustand, framer-motion)
- [ ] Update globals.css with new design tokens
- [ ] Create UI store for sidebar/theme state
- [ ] Implement collapsible sidebar
- [ ] Add theme toggle with persistence
- [ ] Implement FOUC prevention

### Phase 2: Layout & Navigation (Week 2-3)

- [ ] Create new navbar component with breadcrumbs
- [ ] Implement command palette (Cmd+K)
- [ ] Add keyboard shortcuts system
- [ ] Create layout wrapper component
- [ ] Mobile navigation (bottom bar)

### Phase 3: Component Enhancements (Week 3-4)

- [ ] Enhance Button with new variants
- [ ] Create StatusBadge component
- [ ] Create PriorityBadge component
- [ ] Add skeleton variants
- [ ] Create EmptyState component
- [ ] Implement Panel system

### Phase 4: Page Redesigns (Week 4-6)

- [ ] Dashboard/Inbox with split view
- [ ] Ticket detail page
- [ ] Enhanced reply composer
- [ ] User management improvements
- [ ] Settings page

### Phase 5: Polish (Week 6-7)

- [ ] Add micro-interactions
- [ ] Implement panel animations
- [ ] Loading state improvements
- [ ] Accessibility audit
- [ ] Performance optimization

### Phase 6: Advanced Features (Future)

- [ ] Customer management section
- [ ] Analytics/Reports with charts
- [ ] Real-time updates (WebSocket)
- [ ] Email integration UI
- [ ] Mobile app considerations

---

## Quick Reference

### File Locations

| What | Where |
|------|-------|
| Global styles & tokens | `app/globals.css` |
| UI components | `components/ui/` |
| Layout components | `components/layout/` |
| Feature components | `components/[feature]/` |
| UI store | `lib/stores/ui-store.ts` |
| Panel store | `lib/stores/panel-store.ts` |
| Theme provider | `components/providers/theme-provider.tsx` |

### Common Patterns

```tsx
// Conditional classes
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)}>

// Dark mode classes
<div className="bg-white dark:bg-gray-900">

// Responsive classes
<div className="text-sm md:text-base lg:text-lg">

// State classes
<button className="hover:bg-muted active:scale-95 disabled:opacity-50">
```

---

*Document created: January 2026*
*ServDesk Modern UI Design System v1.0*

# PayLog UI Design Flow

> Comprehensive frontend architecture and design system documentation.
> This document serves as a blueprint for understanding and rebuilding the PayLog UI.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Layout Architecture](#4-layout-architecture)
5. [Theme System](#5-theme-system)
6. [Design Tokens](#6-design-tokens)
7. [Component Library](#7-component-library)
8. [State Management](#8-state-management)
9. [Panel System](#9-panel-system)
10. [Responsive Design](#10-responsive-design)
11. [Animations & Transitions](#11-animations--transitions)
12. [Accessibility](#12-accessibility)
13. [Key Pages](#13-key-pages)
14. [Styling Patterns](#14-styling-patterns)
15. [Key Decisions & Rationale](#15-key-decisions--rationale)

---

## 1. Overview

PayLog is an internal invoice tracking and payment management system built with a **modern SaaS-style design**. The UI follows a **v3 Modern Theme** architecture with:

- Clean, minimal design with ample whitespace
- Dark-first approach with full light mode support
- Microsoft 365-inspired stacked panel system
- Mobile-responsive with desktop-optimized experience

**Design Philosophy:**
- Clarity over cleverness
- Consistency across all interactions
- Performance-first animations
- Accessibility as a foundation, not an afterthought

---

## 2. Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework with App Router |
| React | 18.3 | UI library |
| TypeScript | 5.x | Type safety |

### Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.4 | Utility-first CSS |
| Shadcn/ui | Latest | Headless component library |
| Radix UI | Various | Accessible primitives |
| CVA | 0.7 | Class variance authority |
| Tailwind Merge | 2.5 | Class merging utility |

### State Management
| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 4.5 | UI state (sidebar, theme, panels) |
| React Query | 5.x | Server state & caching |
| next-themes | 0.2 | Theme switching |

### UI Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| Lucide React | 0.453 | SVG icons |
| Recharts | 3.2 | Charts and graphs |
| Framer Motion | 11.9 | Animations |
| Sonner | 2.0 | Toast notifications |
| React Hook Form | 7.64 | Form management |
| Zod | 3.23 | Schema validation |

---

## 3. Project Structure

```
paylog-3/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth pages (login)
│   │   └── login/
│   ├── (dashboard)/                  # Protected routes
│   │   ├── dashboard/                # Main dashboard
│   │   ├── invoices/                 # Invoice management
│   │   ├── reports/                  # Reports
│   │   ├── admin/                    # Admin panel
│   │   ├── settings/                 # User settings
│   │   └── layout.tsx                # Dashboard layout
│   ├── api/                          # API routes
│   ├── actions/                      # Server actions
│   ├── globals.css                   # Global styles & tokens
│   └── layout.tsx                    # Root layout
│
├── components/
│   ├── ui/                           # Shadcn/ui primitives (28 components)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ... (25 more)
│   ├── v3/                           # Modern theme components
│   │   ├── layout/                   # Layout components
│   │   │   ├── sidebar.tsx           # Main navigation
│   │   │   ├── navbar.tsx            # Top bar
│   │   │   ├── layout-wrapper.tsx    # Layout orchestrator
│   │   │   └── global-search.tsx     # Command palette
│   │   ├── dashboard/                # Dashboard components
│   │   ├── invoices/                 # Invoice components
│   │   ├── reports/                  # Report components
│   │   ├── admin/                    # Admin components
│   │   ├── settings/                 # Settings components
│   │   └── common/                   # Shared utilities
│   ├── panels/                       # Panel system
│   │   ├── panel-provider.tsx        # Panel context
│   │   ├── panel-container.tsx       # Panel stack renderer
│   │   └── panel-level.tsx           # Individual panel
│   ├── providers/                    # React providers
│   │   ├── theme-provider.tsx
│   │   └── query-provider.tsx
│   └── [feature]/                    # Feature-specific components
│
├── lib/
│   ├── stores/                       # Zustand stores
│   │   ├── ui-version-store.ts       # Theme & sidebar state
│   │   └── panel-store.ts            # Panel stack state
│   ├── utils/                        # Helper functions
│   │   └── cn.ts                     # Class name merger
│   └── validations/                  # Zod schemas
│
├── types/                            # TypeScript definitions
├── hooks/                            # Custom React hooks
└── public/                           # Static assets
```

### File Naming Conventions
- **Components**: `kebab-case.tsx` (e.g., `invoice-form.tsx`)
- **Stores**: `kebab-case-store.ts` (e.g., `panel-store.ts`)
- **Types**: `kebab-case.ts` (e.g., `invoice-types.ts`)
- **Actions**: `kebab-case.ts` (e.g., `invoice-actions.ts`)

---

## 4. Layout Architecture

### Layout Stack

```
┌─────────────────────────────────────────────────────────────┐
│ Root Layout (app/layout.tsx)                                │
│ ├── ThemeProvider (next-themes)                             │
│ ├── QueryProvider (React Query)                             │
│ └── SessionProvider (NextAuth)                              │
│     └── Dashboard Layout (app/(dashboard)/layout.tsx)       │
│         └── LayoutWrapper (v3)                              │
│             ├── Sidebar (fixed left)                        │
│             ├── Navbar (sticky top)                         │
│             ├── Main Content                                │
│             ├── GlobalSearch (command palette)              │
│             └── PanelProvider (stacked panels)              │
└─────────────────────────────────────────────────────────────┘
```

### Layout Measurements

```
┌──────────────────────────────────────────────────────────────────┐
│ NAVBAR (sticky, h-16 / 64px)                                     │
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                     │
│  SIDEBAR   │           MAIN CONTENT AREA                         │
│            │                                                     │
│  Expanded: │     Centered with max-width:                        │
│  w-60      │     - Sidebar expanded: max-w-[1350px]              │
│  (240px)   │     - Sidebar collapsed: max-w-[1500px]             │
│            │                                                     │
│  Collapsed:│     Padding: px-4 py-6                              │
│  w-16      │                                                     │
│  (64px)    │                                                     │
│            │                                                     │
│  Fixed     │     Scrollable (overflow-y-auto)                    │
│  Position  │                                                     │
│            │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

### Sidebar Component

**File:** `components/v3/layout/sidebar.tsx`

**Features:**
- Fixed positioning with z-40
- Collapsible: 240px (expanded) ↔ 64px (collapsed)
- Persisted state in localStorage
- Tooltips in collapsed state
- Badge counts for notifications
- Smooth 300ms transitions
- Mobile: Hidden by default, overlay mode

**Navigation Structure:**
```tsx
const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Invoices', href: '/invoices' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Shield, label: 'Admin', href: '/admin', adminOnly: true },
  // { icon: Settings, label: 'Settings', href: '/settings' }, // Under construction
];
```

### Navbar Component

**File:** `components/v3/layout/navbar.tsx`

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] [Search ⌘K]                    [Sync] [+] [Theme] [User] │
└─────────────────────────────────────────────────────────────────┘
     ↑ Transitions with sidebar              ↑ Fixed at right edge
```

**Key Implementation:**
- Logo + Search: Inside centering wrapper (transitions with sidebar)
- Right icons: Absolute positioned (stationary during sidebar transition)
- Mobile: Hamburger menu replaces sidebar navigation

---

## 5. Theme System

### Theme Architecture

PayLog uses a **dual-theme system** with CSS custom properties:

1. **Base Theme** (`:root` / `.dark`)
2. **Modern Theme** (`.theme-modern` / `.theme-modern.dark`)

The Modern Theme (v3) is the default and recommended theme.

### Theme Provider Setup

**File:** `components/providers/theme-provider.tsx`

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"           // Adds class to <html>
      defaultTheme="system"       // Respects OS preference
      enableSystem                // Enable system detection
      disableTransitionOnChange   // Prevent FOUC
    >
      {children}
    </NextThemesProvider>
  );
}
```

### FOUC Prevention

**File:** `app/layout.tsx` (inline script in `<head>`)

```javascript
// Runs before React hydration to prevent flash
(function() {
  const theme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (!theme && prefersDark)) {
    document.documentElement.classList.add('dark');
  }

  // Also handle sidebar state
  const uiPrefs = localStorage.getItem('paylog-ui-preferences');
  if (uiPrefs) {
    const { sidebarCollapsedV3 } = JSON.parse(uiPrefs);
    if (sidebarCollapsedV3) {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  }
})();
```

### Theme Toggle Component

**File:** `components/ui/theme-toggle.tsx`

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="h-5 w-5 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
```

---

## 6. Design Tokens

### Color System

All colors use **HSL format** for easy manipulation:

**File:** `app/globals.css`

```css
/* ============================================================================
   MODERN THEME - LIGHT MODE
   ============================================================================ */
.theme-modern {
  /* Core Colors */
  --background: 0 0% 100%;               /* White */
  --foreground: 222 47% 11%;             /* Dark Navy Blue */
  --surface: 0 0% 100%;                  /* White */
  --card: 0 0% 100%;                     /* White */

  /* Sidebar */
  --sidebar: 0 0% 100%;                  /* White */
  --sidebar-foreground: 222 47% 11%;    /* Dark Navy Blue */
  --sidebar-border: 220 13% 91%;        /* Light Gray */
  --sidebar-muted: 220 14% 96%;         /* Very Light Gray */
  --sidebar-hover: 220 14% 93%;         /* Light Gray */
  --sidebar-active: 217 91% 95%;        /* Very Light Blue */
  --sidebar-active-foreground: 217 91% 45%; /* Medium Blue */

  /* Primary (Brand) */
  --primary: 217 91% 60%;               /* Bright Blue */
  --primary-foreground: 0 0% 100%;      /* White */

  /* Secondary */
  --secondary: 220 14% 96%;             /* Very Light Gray */
  --secondary-foreground: 222 47% 11%; /* Dark Navy Blue */

  /* Muted */
  --muted: 220 14% 96%;                 /* Very Light Gray */
  --muted-foreground: 220 9% 46%;      /* Medium Gray */

  /* Semantic Status Colors */
  --status-urgent: 0 100% 75%;          /* Light Red / Pink */
  --status-warning: 27 96% 61%;         /* Orange */
  --status-success: 142 69% 58%;        /* Green */
  --status-info: 217 91% 68%;           /* Light Blue */
  --status-accent: 263 70% 76%;         /* Light Purple */

  /* Destructive */
  --destructive: 0 84% 60%;             /* Red */
  --destructive-foreground: 0 0% 100%; /* White */

  /* Info/Warning/Success */
  --info: 217 91% 60%;                  /* Bright Blue */
  --warning: 38 92% 50%;                /* Amber / Orange */
  --success: 142 72% 40%;               /* Dark Green */

  /* Borders & Inputs */
  --border: 220 13% 91%;                /* Light Gray */
  --input: 220 13% 91%;                 /* Light Gray */
  --ring: 217 91% 60%;                  /* Bright Blue */
}

/* ============================================================================
   MODERN THEME - DARK MODE
   ============================================================================ */
.theme-modern.dark {
  /* Core Colors */
  --background: 224 71% 4%;             /* Very Dark Navy (Almost Black) */
  --foreground: 0 0% 100%;              /* White */
  --surface: 222 47% 11%;               /* Dark Navy Blue */
  --card: 222 47% 11%;                  /* Dark Navy Blue */

  /* Sidebar */
  --sidebar: 224 71% 4%;                /* Very Dark Navy */
  --sidebar-foreground: 210 20% 98%;   /* Off-White */
  --sidebar-border: 217 19% 17%;       /* Dark Gray-Blue */
  --sidebar-muted: 217 19% 17%;        /* Dark Gray-Blue */
  --sidebar-hover: 217 19% 20%;        /* Slightly Lighter */
  --sidebar-active: 217 91% 15%;       /* Very Dark Blue */
  --sidebar-active-foreground: 217 91% 68%; /* Light Blue */

  /* Primary (Brand) */
  --primary: 217 91% 60%;               /* Bright Blue */
  --primary-foreground: 0 0% 100%;      /* White */

  /* Muted */
  --muted: 217 19% 17%;                 /* Dark Gray-Blue */
  --muted-foreground: 215 20% 65%;     /* Medium Gray */

  /* Shadows - Darker for dark mode */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.4);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.45);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
}
```

### Typography Scale

```css
:root {
  /* Font Sizes */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
}
```

### Spacing System

Based on 4px (0.25rem) increments:

| Token | Value | Pixels |
|-------|-------|--------|
| `space-1` | 0.25rem | 4px |
| `space-2` | 0.5rem | 8px |
| `space-3` | 0.75rem | 12px |
| `space-4` | 1rem | 16px |
| `space-6` | 1.5rem | 24px |
| `space-8` | 2rem | 32px |
| `space-12` | 3rem | 48px |
| `space-16` | 4rem | 64px |

### Border Radius

```css
:root {
  --radius: 0.75rem;          /* 12px - Default */
  --radius-sm: 0.5rem;        /* 8px */
  --radius-md: 0.75rem;       /* 12px */
  --radius-lg: 1rem;          /* 16px */
  --radius-xl: 1.5rem;        /* 24px */
  --radius-full: 9999px;      /* Pill shape */
}
```

### Shadow System (Elevation)

```css
:root {
  /* Light mode shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}
```

### Layout Variables

```css
:root {
  --sidebar-width-expanded: 240px;   /* w-60 */
  --sidebar-width-collapsed: 64px;   /* w-16 */
  --navbar-height: 64px;             /* h-16 */

  /* Transition Durations */
  --transition-theme: 500ms;
  --transition-sidebar: 300ms;
  --transition-hover: 150ms;
  --transition-dropdown: 200ms;
}
```

---

## 7. Component Library

### UI Components (Shadcn/ui)

All components in `components/ui/` follow the Shadcn/ui pattern:

| Component | File | Key Features |
|-----------|------|--------------|
| **Button** | `button.tsx` | 8 variants, 4 sizes, loading state |
| **Input** | `input.tsx` | Focus ring, error state |
| **Select** | `select.tsx` | Radix-based, searchable |
| **Dialog** | `dialog.tsx` | Modal with backdrop |
| **Dropdown Menu** | `dropdown-menu.tsx` | Context menus |
| **Tabs** | `tabs.tsx` | URL-synced tabs |
| **Table** | `table.tsx` | Sortable, responsive |
| **Avatar** | `avatar.tsx` | Image + fallback |
| **Badge** | `badge.tsx` | Status indicators |
| **Card** | `card.tsx` | Content container |
| **Checkbox** | `checkbox.tsx` | Accessible checkbox |
| **Switch** | `switch.tsx` | Toggle switch |
| **Tooltip** | `tooltip.tsx` | Hover tooltips |
| **Calendar** | `calendar.tsx` | Date picker |
| **Command** | `command.tsx` | Search palette |
| **Alert** | `alert.tsx` | Alert messages |
| **Skeleton** | `skeleton.tsx` | Loading placeholder |

### Button Variants

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-0 focus-visible:border-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        subtle: 'bg-muted/50 text-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground hover:bg-success/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### v3 Feature Components

Located in `components/v3/`:

| Category | Components |
|----------|------------|
| **Layout** | `sidebar.tsx`, `navbar.tsx`, `layout-wrapper.tsx`, `global-search.tsx` |
| **Dashboard** | `kpi-cards.tsx`, `payment-chart.tsx`, `activity-feed.tsx` |
| **Invoices** | `invoice-tabs.tsx`, `invoice-filters.tsx`, `invoice-table.tsx` |
| **Reports** | `report-tabs.tsx`, `consolidated-report.tsx` |
| **Admin** | `admin-tabs.tsx`, `approval-tabs.tsx`, `master-data-tabs.tsx` |
| **Settings** | `settings-tabs.tsx`, `profile-settings.tsx` |
| **Common** | `page-header.tsx`, `pagination-controls.tsx` |

---

## 8. State Management

### UI State (Zustand)

**File:** `lib/stores/ui-version-store.ts`

```tsx
interface UIVersionStore {
  // Theme version (v1, v2, v3)
  version: 'v1' | 'v2' | 'v3';
  setVersion: (version) => void;

  // Sidebar collapse state (per theme)
  sidebarCollapsedV3: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  getCurrentSidebarCollapsed: () => boolean;

  // Mobile menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // Invoice creation mode preference
  invoiceCreationMode: 'page' | 'panel';
  setInvoiceCreationMode: (mode) => void;
}

// Persistence configuration
persist(store, {
  name: 'paylog-ui-preferences',
  version: 3,
  migrate: (state, version) => {
    // Auto-migrate v1/v2 users to v3
    if (version < 3) {
      return { ...state, version: 'v3' };
    }
    return state;
  },
})
```

### Server State (React Query)

**File:** `components/providers/query-provider.tsx`

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 60 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Usage Pattern

```tsx
// Server Component (fetches data)
async function DashboardPage() {
  const data = await getCachedDashboardData();
  return <DashboardClient initialData={data} />;
}

// Client Component (manages state)
'use client';
function DashboardClient({ initialData }) {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    initialData,
  });

  return <Dashboard data={data} />;
}
```

---

## 9. Panel System

### Architecture

The panel system follows **Microsoft 365's stacked drawer pattern**:

```
┌────────────────────────────────────────────────────────────────────┐
│                         Main Content                               │
├────────────────────────────────────────────────────────────────────┤
│                                          ┌─────────────────────────┤
│                                          │      PANEL LEVEL 1      │
│                                          │   (z-index: 50)         │
│                                          │   width: MEDIUM (650px) │
│                                          │         ┌───────────────┤
│                                          │         │  PANEL LVL 2  │
│                                          │         │ (z-index: 55) │
│                                          │         │      ┌────────┤
│                                          │         │      │LVL 3   │
│                                          │         │      │(z:60)  │
└────────────────────────────────────────────────────────────────────┘
```

### Panel Store

**File:** `lib/stores/panel-store.ts`

```tsx
interface PanelConfig {
  id: string;
  type: string;
  props: Record<string, unknown>;
  width?: number;
  level: 1 | 2 | 3;
  zIndex: number;
}

interface PanelStackStore {
  panels: PanelConfig[];

  openPanel: (type: string, props: object, options?: { width?: number }) => string;
  closePanel: (id: string) => void;
  closeTopPanel: () => void;
  closeAllPanels: () => void;
}
```

### Panel Widths

```tsx
const PANEL_WIDTH = {
  SMALL: 400,    // Quick forms, confirmations
  MEDIUM: 650,   // Default: detail views, forms
  LARGE: 900,    // Complex forms, tables
};
```

### Panel Types

```tsx
// Invoice panels
'invoice-detail' | 'invoice-edit' | 'invoice-create' | 'payment-form'

// Master data panels
'vendor-form' | 'category-form' | 'master-data-request'

// Admin panels
'admin-user-edit' | 'admin-approval'

// Profile panels
'profile-edit' | 'profile-security'
```

### Usage

```tsx
import { usePanelStore } from '@/lib/stores/panel-store';

function InvoiceList() {
  const { openPanel } = usePanelStore();

  const handleViewInvoice = (id: string) => {
    openPanel('invoice-detail', { invoiceId: id });
  };

  const handleEditInvoice = (id: string) => {
    // Opens as nested panel from detail view
    openPanel('invoice-edit', { invoiceId: id }, { width: 900 });
  };

  return (
    <button onClick={() => handleViewInvoice('123')}>
      View Invoice
    </button>
  );
}
```

---

## 10. Responsive Design

### Breakpoints

Mobile-first approach using Tailwind's default breakpoints:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `xs` | 0px | Default (mobile) |
| `sm` | 640px | Large phones |
| `md` | 768px | **KEY: Sidebar toggle** |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Ultra-wide |

### Responsive Patterns

```tsx
// Sidebar: Hidden on mobile, visible on desktop
<aside className="hidden md:flex fixed left-0 top-0 h-screen w-60">

// Content margin: Adjusts for sidebar
<main className="md:ml-60">

// Mobile menu: Shows on mobile only
<button className="md:hidden">
  <Menu />
</button>

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Panels: Full width on mobile
<div className="w-full md:w-[650px]">

// Text: Responsive sizes
<h1 className="text-xl md:text-2xl lg:text-3xl">
```

### Layout Differences

| Element | Mobile (<768px) | Desktop (≥768px) |
|---------|-----------------|------------------|
| Sidebar | Hidden (overlay mode) | Fixed, visible |
| Navbar | Menu button + right icons | Full navigation |
| Content | Full width | Offset by sidebar |
| Panels | 100% width | Fixed widths (400-900px) |
| Tables | Horizontal scroll | Full responsive |
| Forms | Single column | Multi-column |

---

## 11. Animations & Transitions

### Transition Utilities

```css
/* Global smooth transitions */
.transition-smooth {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-smooth-fast {
  transition-duration: 150ms;
}

.transition-smooth-slow {
  transition-duration: 300ms;
}
```

### Micro-interactions

```css
/* Button press effect */
.btn-press:active {
  transform: scale(0.97);
  transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Card hover lift */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Element scale on hover */
.hover-scale:hover {
  transform: scale(1.02);
}
```

### Animation Keyframes

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Usage */
.animate-fade-in { animation: fadeIn 300ms ease-out; }
.animate-slide-in-bottom { animation: slideInFromBottom 300ms ease-out; }
.animate-slide-in-right { animation: slideInFromRight 300ms ease-out; }
```

### Theme Transitions

```css
/* Smooth theme transitions for modern theme */
.theme-modern * {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: var(--transition-theme, 500ms);
}

/* Faster transitions for interactive elements */
.theme-modern button,
.theme-modern a,
.theme-modern input {
  transition-duration: var(--transition-hover, 150ms);
}
```

### Sidebar Transitions

```tsx
// Smooth width and margin transitions
<aside className={cn(
  'transition-all duration-300 ease-in-out',
  isCollapsed ? 'w-16' : 'w-60'
)}>

<main className={cn(
  'transition-[margin] duration-300 ease-in-out',
  isCollapsed ? 'md:ml-16' : 'md:ml-60'
)}>
```

---

## 12. Accessibility

### Focus Management

```css
/* Keyboard-only focus rings */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: var(--ring);
  ring-offset: 2px;
}

/* Remove focus ring on mouse click */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### Skip to Content

```tsx
// components/v3/layout/layout-wrapper.tsx
<a
  href="#main-content"
  className="skip-to-content"
>
  Skip to main content
</a>

<main id="main-content" role="main">
  {children}
</main>
```

```css
.skip-to-content {
  @apply absolute left-0 top-0 -translate-y-full;
  @apply bg-primary px-4 py-2 text-primary-foreground;
  @apply transition-transform focus:translate-y-0 z-50;
}
```

### ARIA Attributes

```tsx
// Navigation
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/dashboard" aria-current={isActive ? 'page' : undefined}>Dashboard</a></li>
  </ul>
</nav>

// Dialogs
<Dialog>
  <DialogContent aria-describedby="dialog-description">
    <DialogTitle>Edit Invoice</DialogTitle>
    <p id="dialog-description">Make changes to your invoice.</p>
  </DialogContent>
</Dialog>

// Loading states
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Spinner /> : <Content />}
</div>

// Decorative icons
<Icon aria-hidden="true" />
```

### Color Contrast

- All text meets **WCAG AA** (4.5:1 ratio)
- Interactive elements have 3:1 contrast
- Status colors distinguishable for color-blind users

---

## 13. Key Pages

### Dashboard (`/dashboard`)

**Purpose:** KPI overview, charts, activity feed

**Components:**
- `KPICards` - Metric cards (Total Invoices, Pending, Paid, etc.)
- `PaymentChart` - Line/bar chart for payment trends
- `StatusBreakdown` - Pie chart for invoice statuses
- `ActivityFeed` - Recent activity list

**Data Fetching:**
```tsx
const [kpis, statusData, trends] = await Promise.all([
  getCachedDashboardKPIs(dateRange),
  getCachedInvoiceStatusBreakdown(),
  getCachedPaymentTrends(),
]);
```

### Invoices (`/invoices`)

**Purpose:** Invoice management with tabs

**Tabs:**
- Recurring - Recurring invoices
- All Invoices - Complete list
- TDS Applicable - Tax deduction filtered
- Deleted - Soft-deleted invoices

**Features:**
- Advanced filters (status, vendor, date range)
- Bulk operations
- Panel-based editing
- Export functionality

### Reports (`/reports`)

**Purpose:** Financial reports and analytics

**Tabs:**
- Consolidated - Overall summary
- Monthly - Month-by-month breakdown
- TDS Summary - Tax deduction reports
- Categorized - By expense category

### Admin (`/admin`)

**Purpose:** System administration

**Tabs:**
- Approvals - Pending approval requests
- Master Data - Vendors, categories management
- User Management - User CRUD (super_admin only)

### Settings (`/settings`)

**Purpose:** User preferences

**Sections:**
- Profile - Name, email, avatar
- Security - Password, 2FA
- Activities - Login history

---

## 14. Styling Patterns

### Class Name Utility

**File:** `lib/utils/cn.ts`

```tsx
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
cn(
  'base-classes',
  condition && 'conditional-classes',
  props.className
)
```

### CVA (Class Variance Authority)

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg border bg-card p-4',  // Base styles
  {
    variants: {
      variant: {
        default: 'border-border',
        highlighted: 'border-primary bg-primary/5',
      },
      size: {
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface CardProps extends VariantProps<typeof cardVariants> {
  children: React.ReactNode;
}

function Card({ variant, size, children }: CardProps) {
  return <div className={cardVariants({ variant, size })}>{children}</div>;
}
```

### Common Patterns

```tsx
// Conditional classes
<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  isDisabled && 'disabled-styles'
)}>

// Responsive classes
<div className="text-sm md:text-base lg:text-lg">

// State variants
<button className="hover:bg-muted focus-visible:ring-2 disabled:opacity-50">

// Dark mode
<div className="bg-white dark:bg-gray-900">

// Group hover
<div className="group">
  <span className="group-hover:text-primary">Hover parent to change me</span>
</div>
```

---

## 15. Key Decisions & Rationale

### Why Shadcn/ui over Other Libraries?

| Decision | Rationale |
|----------|-----------|
| **Shadcn/ui** | Copy-paste components, full control, no version lock-in |
| **Radix UI primitives** | Accessibility-first, unstyled, composable |
| **Tailwind CSS** | Utility-first, no context switching, tree-shakeable |

### Why Zustand over Redux/Context?

| Decision | Rationale |
|----------|-----------|
| **Zustand** | Minimal boilerplate, built-in persistence, no providers needed |
| **React Query** | Server state is different from UI state, automatic caching |
| **Split stores** | Separation of concerns (UI state vs panel state) |

### Why Stacked Panels over Modals?

| Decision | Rationale |
|----------|-----------|
| **Stacked panels** | Context preservation, natural drill-down, MS 365 familiarity |
| **Max 3 levels** | Prevents deep nesting, maintains clarity |
| **Right-side entry** | Natural reading flow (LTR), content stays visible |

### Why CSS Variables for Theming?

| Decision | Rationale |
|----------|-----------|
| **CSS custom properties** | Runtime theme switching, no rebuild needed |
| **HSL format** | Easy to adjust lightness/saturation programmatically |
| **Semantic naming** | `--primary` vs `--blue-500` for flexibility |

### Why Server Components + Client Wrappers?

| Decision | Rationale |
|----------|-----------|
| **Server components** | Initial data fetch, smaller JS bundle |
| **Client wrappers** | Interactivity where needed |
| **React Query** | Smooth transition, background refetch |

---

## Appendix: Quick Reference

### File Locations

| What | Where |
|------|-------|
| Global styles | `app/globals.css` |
| Theme tokens | `app/globals.css` (`:root`, `.dark`, `.theme-modern`) |
| Tailwind config | `tailwind.config.ts` |
| UI components | `components/ui/` |
| Layout components | `components/v3/layout/` |
| UI state store | `lib/stores/ui-version-store.ts` |
| Panel store | `lib/stores/panel-store.ts` |
| Theme provider | `components/providers/theme-provider.tsx` |

### Common Commands

```bash
# Development
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build
```

### Adding a New UI Component

1. Create file in `components/ui/` or `components/v3/[feature]/`
2. Use CVA for variants
3. Use `cn()` for class merging
4. Add `forwardRef` if DOM access needed
5. Export from component file

### Adding a New Page

1. Create folder in `app/(dashboard)/[route]/`
2. Add `page.tsx` (server component)
3. Create client wrapper if needed
4. Add to sidebar navigation in `components/v3/layout/sidebar.tsx`

---

*Document generated: January 2026*
*PayLog v3 Modern Theme Architecture*

# Dark Mode / Light Mode Implementation Guide

> **Purpose**: This document explains how dark/light mode theming is implemented in the Paylog codebase and provides best practices to prevent the "flash of unstyled content" (FOUC) issue during page loads.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [How It Works](#how-it-works)
4. [CSS Variables & Tailwind Setup](#css-variables--tailwind-setup)
5. [Preventing Flash (FOUC)](#preventing-flash-fouc)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Best Practices Checklist](#best-practices-checklist)
8. [File Reference](#file-reference)

---

## Architecture Overview

The theme system uses a **multi-layer approach**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. Inline Script (runs BEFORE React)                           │
│     └── Reads localStorage → Sets .dark class on <html>         │
├─────────────────────────────────────────────────────────────────┤
│  2. CSS Variables                                                │
│     └── :root (light) vs .dark (dark) styles                    │
├─────────────────────────────────────────────────────────────────┤
│  3. next-themes Provider (React)                                 │
│     └── Manages theme state, provides useTheme() hook           │
├─────────────────────────────────────────────────────────────────┤
│  4. Theme Toggle Components                                      │
│     └── UI for users to switch themes                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Libraries:**
- `next-themes` (v0.2.1) - Theme state management
- `tailwindcss` (v3.4.1) - Utility CSS with class-based dark mode

---

## Core Components

### 1. Root Layout (`app/layout.tsx`)

The root layout contains a **critical inline script** that runs before React hydrates:

```typescript
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;
```

**Why inline script?**
- Runs synchronously before the browser paints
- Sets the `.dark` class BEFORE any CSS is applied
- Prevents the white flash when user prefers dark mode

**HTML Setup:**
```tsx
<html lang="en" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: themeScript }} />
  </head>
  <body>
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>
```

> **Important**: `suppressHydrationWarning` is required because the server renders without the `.dark` class, but the client may add it before hydration.

### 2. Theme Provider (`components/providers/theme-provider.tsx`)

```typescript
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class"           // Applies theme via class on <html>
      defaultTheme="system"       // Respects OS preference
      enableSystem                // Enables system preference detection
      disableTransitionOnChange   // Prevents flash during toggle
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

**Configuration Options:**
| Option | Value | Purpose |
|--------|-------|---------|
| `attribute` | `"class"` | Theme applied via `.dark` class (not `data-theme`) |
| `defaultTheme` | `"system"` | Follows OS dark/light preference |
| `enableSystem` | `true` | Allows system preference detection |
| `disableTransitionOnChange` | `true` | Prevents CSS transition flash when toggling |

### 3. Theme Toggle (`components/ui/theme-toggle.tsx`)

```typescript
export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // CRITICAL: Wait for client-side mount before rendering theme-dependent UI
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Button onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {/* Only render the correct icon after mount */}
      {mounted && isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
```

> **Why `mounted` state?** During SSR, `useTheme()` doesn't know the actual theme. We must wait until client-side hydration to show the correct icon.

---

## How It Works

### Page Load Timeline

```
Time ──────────────────────────────────────────────────────────────►

1. HTML received by browser
   │
2. Inline script executes (synchronous, blocking)
   │  └── Reads localStorage['theme']
   │  └── Adds .dark class to <html> if needed
   │
3. CSS loads and applies
   │  └── .dark { ... } rules now active
   │
4. Body renders with correct theme colors
   │
5. React hydrates
   │  └── ThemeProvider initializes
   │  └── Components mount
   │
6. LayoutWrapper adds .hydrated class
   │  └── Layout fades in (150ms transition)
   │
7. Page fully interactive
```

### Theme Detection Priority

1. **Explicit user choice** → `localStorage['theme']` = `'light'` or `'dark'`
2. **System preference** → `localStorage['theme']` = `'system'` or undefined
   - Checks `window.matchMedia('(prefers-color-scheme: dark)')`
3. **Fallback** → Light mode

---

## CSS Variables & Tailwind Setup

### Tailwind Configuration (`tailwind.config.ts`)

```typescript
module.exports = {
  darkMode: ["class"],  // Class-based dark mode (NOT media query)
  // ...
}
```

### CSS Variables (`app/globals.css`)

**Light Mode (default):**
```css
:root {
  --background: 0 0% 100%;        /* White */
  --foreground: 222 47% 6%;       /* Dark navy */
  --primary: 217 91% 60%;         /* Blue */
  --muted: 217 19% 96%;           /* Light gray */
  /* ... 20+ more variables */
}
```

**Dark Mode:**
```css
.dark {
  --background: 220 12% 6%;       /* Very dark blue */
  --foreground: 0 0% 96%;         /* Off-white */
  --primary: 217 91% 60%;         /* Blue (same) */
  --muted: 217 19% 15%;           /* Dark gray */
  /* ... matching variables */
}
```

**Using Variables in Components:**
```tsx
// Tailwind classes automatically use CSS variables
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

---

## Preventing Flash (FOUC)

### The Problem

Without proper handling, users see this sequence:
1. **White page** (default light mode)
2. **Flash!** (React hydrates, adds `.dark` class)
3. **Dark page** (correct theme)

This happens because:
- Server renders HTML without knowing user's theme preference
- CSS defaults to light mode (`:root` styles)
- Client-side JavaScript adds `.dark` class after page renders

### The Solution (Implemented)

#### Layer 1: Inline Script (Critical)

The inline script in `<head>` runs **before** the page renders:

```html
<head>
  <script>
    (function() {
      var theme = localStorage.getItem('theme');
      var isDark = theme === 'dark' ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
    })();
  </script>
</head>
```

> **Key**: This script is synchronous and blocking. The browser won't paint until it completes.

#### Layer 2: Layout Fade-In

The layout wrapper starts hidden and fades in after hydration:

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

```tsx
// LayoutWrapper component
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

return (
  <div
    data-layout-wrapper
    className={cn("min-h-screen", mounted && "hydrated")}
  >
    {children}
  </div>
);
```

#### Layer 3: Transition Suppression

next-themes is configured with `disableTransitionOnChange`:

```tsx
<NextThemesProvider disableTransitionOnChange>
```

This prevents CSS transitions from animating during theme changes, which would cause visible flashing.

---

## Common Issues & Solutions

### Issue 1: Flash on Page Refresh (Dark Mode)

**Symptoms:**
- Page briefly shows light mode before switching to dark
- Only happens on refresh, not initial load

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Inline script not in `<head>` | Move script to be first child of `<head>` |
| Script uses `defer` or `async` | Remove these attributes (must be synchronous) |
| Script has syntax error | Check browser console, wrap in try-catch |
| localStorage blocked (incognito) | Script already handles with try-catch |

**Verify Inline Script is Working:**
```javascript
// Add to browser console
console.log('Theme from localStorage:', localStorage.getItem('theme'));
console.log('HTML has dark class:', document.documentElement.classList.contains('dark'));
```

### Issue 2: Hydration Mismatch Errors

**Symptoms:**
- Console error: "Hydration failed because the initial UI does not match"
- Usually on theme toggle button

**Solution:**
Use the `mounted` pattern:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// Don't render theme-dependent content until mounted
if (!mounted) return <Skeleton />;

return <ThemeToggle />;
```

### Issue 3: Theme Doesn't Persist

**Symptoms:**
- Theme resets to light mode on refresh
- User preference not saved

**Check:**
1. `localStorage.getItem('theme')` returns expected value
2. No errors in browser console
3. Inline script is reading correct localStorage key

### Issue 4: System Preference Not Detected

**Symptoms:**
- Setting theme to "system" always shows light mode
- Dark mode users see light mode

**Check:**
1. `enableSystem` is `true` in ThemeProvider
2. Inline script includes system preference check:
   ```javascript
   window.matchMedia('(prefers-color-scheme: dark)').matches
   ```

---

## Best Practices Checklist

### For New Projects

- [ ] Install `next-themes`: `pnpm add next-themes`
- [ ] Configure Tailwind with `darkMode: ["class"]`
- [ ] Create CSS variables for both `:root` and `.dark`
- [ ] Add inline script to `<head>` (synchronous, no defer/async)
- [ ] Add `suppressHydrationWarning` to `<html>` tag
- [ ] Wrap app in `ThemeProvider`
- [ ] Use `mounted` state in all theme-dependent components

### For Theme Toggle Components

```tsx
// Template for safe theme toggle
export function SafeThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  // Show placeholder during SSR/hydration
  if (!mounted) {
    return <div className="w-9 h-9" />; // Same size as button
  }

  return (
    <Button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
```

### For CSS Variables

```css
/* Always define both light and dark versions */
:root {
  --custom-color: #ffffff;
}
.dark {
  --custom-color: #000000;
}

/* Use with Tailwind arbitrary values */
.my-component {
  color: hsl(var(--custom-color));
}
```

### For Conditional Rendering

```tsx
// WRONG - causes hydration mismatch
const theme = useTheme();
return <div>{theme === 'dark' ? 'Dark' : 'Light'}</div>;

// CORRECT - waits for client
const [mounted, setMounted] = useState(false);
const { theme } = useTheme();

useEffect(() => setMounted(true), []);

if (!mounted) return null;
return <div>{theme === 'dark' ? 'Dark' : 'Light'}</div>;
```

---

## File Reference

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with inline theme script |
| `components/providers/theme-provider.tsx` | next-themes wrapper component |
| `app/globals.css` | CSS variables for light/dark themes |
| `tailwind.config.ts` | Tailwind dark mode configuration |
| `components/ui/theme-toggle.tsx` | Standalone theme toggle button |
| `components/v3/layout/navbar.tsx` | Navbar with integrated toggle |
| `components/v3/layout/layout-wrapper.tsx` | Hydration-safe layout wrapper |

---

## Debugging Tips

### Check Theme State

```javascript
// Browser console
localStorage.getItem('theme')                    // User preference
document.documentElement.classList.contains('dark')  // Current state
window.matchMedia('(prefers-color-scheme: dark)').matches  // System pref
```

### Simulate System Preference

Chrome DevTools → Rendering → Emulate CSS media feature `prefers-color-scheme`

### Check for Flash

1. Open DevTools Network tab
2. Set throttling to "Slow 3G"
3. Refresh page in dark mode
4. Watch for white flash before dark mode applies

---

## Summary

The dark/light mode implementation follows industry best practices:

1. **Inline script** prevents flash by setting theme before render
2. **CSS variables** provide consistent theming across components
3. **next-themes** manages state and provides React hooks
4. **mounted pattern** prevents hydration mismatches
5. **Layout fade-in** masks any remaining timing issues

If you experience flash issues, check:
1. Inline script is in `<head>` and synchronous
2. `suppressHydrationWarning` is on `<html>`
3. No async/defer on the theme script
4. CSS variables are defined for both `:root` and `.dark`

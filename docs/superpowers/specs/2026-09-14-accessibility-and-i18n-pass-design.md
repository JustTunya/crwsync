# Technical Design Specification: Accessibility & Internationalization Pass

**Date**: 2026-09-14  
**Status**: Approved  
**Scope**: `packages/i18n`, `packages/styles`, `apps/frontend/web`, `apps/frontend/dash`

---

## 1. Overview & Objectives

This specification defines the architecture and implementation strategy for the **Accessibility & Internationalization Pass** in Milestone 5 of the crwsync roadmap. 

The primary objectives are:
1. **Internationalization (i18n)**: Establish a shared, zero-bloat, type-safe localization foundation (`@crwsync/i18n`) with typed dictionary namespaces, a React `I18nProvider`, `useTranslation()` / `useLocale()` / `useFormatters()` hooks, standardized `Intl` formatters (dates, relative times, numbers), and dynamic `<html lang="...">` and `dir="ltr|rtl"` synchronization.
2. **Accessibility (a11y) & WCAG 2.1 AA Compliance**:
   - Calibrate light and dark mode color tokens in `packages/styles/src/globals.css` to guarantee at least 4.5:1 text contrast and 3:1 graphical component contrast.
   - Implement `SkipToContent` navigation and explicit semantic landmarks (`<main id="main-content">`, `<header role="banner">`, `<nav aria-label="...">`, `<aside>`, `<footer role="contentinfo">`) across both public web portal and dashboard.
   - Unify visible focus rings (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) across all interactive UI primitives (`Button`, `Input`, `Checkbox`, `Toggle`, `Select`, `Dialog`, `Popover`).
   - Implement a centralized `LiveAnnouncer` component and `useAnnounce()` hook with `aria-live="polite"` and `role="status"` for screen-reader notifications of real-time socket events (task updates, chat messages, toasts).
   - Audit and equip all icon-only interactive elements with clear, descriptive `aria-label`s.
   - Ensure complete form accessibility with proper `htmlFor` / `id` associations, `aria-invalid`, and `aria-describedby` error linkages.
   - Add `@media (prefers-reduced-motion: reduce)` support across animations.

---

## 2. Package Architecture: `@crwsync/i18n`

A new shared package `packages/i18n` will be created in the Turborepo monorepo:

### Directory Structure
```
packages/i18n/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── locales/
│   │   ├── en.ts
│   │   └── es.ts
│   ├── context/
│   │   └── i18n.provider.tsx
│   ├── hooks/
│   │   ├── use-translation.ts
│   │   ├── use-locale.ts
│   │   └── use-formatters.ts
│   └── utils/
│       ├── format-date.ts
│       └── format-number.ts
```

### Type-Safe Translation System
* **Dictionary Structure**:
  * Namespaces: `common`, `nav`, `auth`, `dashboard`, `kanban`, `chat`, `files`, `settings`, `legal`.
  * TypeScript type definition `TranslationKey` recursively extracts paths from `en.ts` (e.g., `"common.save"`, `"kanban.addTask"`).
  * Parameter interpolation support: `t("chat.typing", { user: "Sarah" })` interpolates `{user}` in `"{{user}} is typing..."`.
* **State & Persistence**:
  * Stored in `localStorage` under key `crwsync_locale` with initial detection from `navigator.language` (defaulting to `"en"`).
  * `I18nProvider` dynamically updates document root attributes:
    ```ts
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = isRtl(currentLocale) ? "rtl" : "ltr";
    ```

### Native `Intl` Formatter Utilities
* `formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions, locale?: string): string`
* `formatRelativeTime(date: Date | string | number, locale?: string): string`
* `formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string): string`
* `formatCompactNumber(value: number, locale?: string): string`

---

## 3. Accessibility & Contrast Architecture

### Color Contrast Calibration (`packages/styles/src/globals.css`)
* **Tokens**:
  * `--muted-foreground`: Calibrated to `oklch(0.42 0.016 49.76)` in light mode and `oklch(0.72 0.016 49.76)` in dark mode to guarantee ≥ 4.5:1 contrast against surface backgrounds.
  * `--placeholder`: Calibrated to `oklch(0.50 0.020 64.35)` to ensure clear form placeholder legibility.
  * `--primary-foreground`: Kept crisp pure white `oklch(1.0 0 0)` on warm orange `oklch(0.703 0.188 36.91)` meeting high-contrast standards.
* **Reduced Motion**:
  * Global CSS rule:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```

### Semantic Landmarks & Skip Navigation
* **`SkipToContent` Component**:
  ```tsx
  export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
    return (
      <a
        href={`#${targetId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
    );
  }
  ```
* **Landmarks**:
  * `web`: `<header role="banner">`, `<nav aria-label="Main Navigation">`, `<main id="main-content">`, `<footer role="contentinfo">`.
  * `dash`: `<header role="banner">`, `<aside aria-label="Workspace Sidebar">`, `<main id="main-content">`, `<aside aria-label="Context Sidebar">`.

### Visible Focus Management
* Standardize `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` across all interactive primitives:
  * `Button`, `Input`, `Checkbox`, `Toggle`, `Select`, `DialogContent`, `PopoverContent`.
* Kanban board keyboard support:
  * Tasks: `tabIndex={0}`, `role="article"`, `aria-label="Task: {title}, in {column}, priority {priority}"`.
  * Keyboard activation: `Enter` or `Space` opens the task detail modal.

### Screen Reader Live Announcements (`LiveAnnouncer`)
* Centralized `LiveAnnouncer` component rendered at dashboard root.
* Container:
  ```tsx
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {announcement}
  </div>
  ```
* `useAnnounce()` hook exposes `announce(message: string)` for polite announcements on task updates, chat receipts, and system events.

### Comprehensive ARIA & Form Audit
* Add `aria-label` to all icon-only buttons:
  * Search triggers (`aria-label="Search workspace (Ctrl+K)"`)
  * Notification triggers (`aria-label="Notifications"`)
  * Emoji picker buttons (`aria-label="Add reaction"`, `aria-label="Choose emoji"`)
  * Modal close buttons (`aria-label="Close dialog"`)
  * Theme switcher buttons (`aria-label="Toggle light and dark theme"`)
  * Sidebar collapse/expand buttons (`aria-label="Collapse sidebar"`, `aria-label="Expand sidebar"`)
* Ensure form inputs have explicit `htmlFor` / `id` bindings, `aria-invalid={!!error}`, and `aria-describedby={error ? "${id}-error" : undefined}`.

---

## 4. Integration & Verification Strategy

### Integration Points
1. **`apps/frontend/web`**: Wrap root layout with `I18nProvider`, insert `SkipToContent`, add semantic landmarks to headers/footers/auth forms, and update form components with accessible labels and contrast tokens.
2. **`apps/frontend/dash`**: Wrap root layout with `I18nProvider` and `LiveAnnouncer`, insert `SkipToContent`, add semantic landmarks across workspace sidebar and main board/chat panels, audit Kanban and chat a11y, and wire `useAnnounce` into socket events.

### Verification Checklist (Manual Testing Protocol)
1. **Keyboard Navigation & Focus Traps**:
   - Tab through the public portal (`/`, `/auth/signin`, `/auth/signup`, `/terms`, `/privacy`): verify `SkipToContent` appears on initial Tab, all links/inputs/buttons receive visible focus rings, and Tab order is logical.
   - Tab through Dashboard (`/[slug]`, Kanban board, Chat room, Settings): verify modal focus trapping (Escape closes modals, focus returns to trigger), task cards can be focused and opened via Enter/Space.
2. **Screen Reader & Live Regions**:
   - Inspect accessibility tree / run screen reader: verify landmark roles (`banner`, `main`, `navigation`, `contentinfo`, `complementary`).
   - Trigger a task move or chat message: verify text update is dispatched to polite live region.
   - Check all icon buttons have accessible text.
3. **Contrast & Reduced Motion**:
   - Inspect computed colors for WCAG 2.1 AA compliance (normal text ≥ 4.5:1).
   - Enable "Prefer reduced motion" in OS/browser: verify ripple/animations instantly settle without jarring motion.
4. **i18n & Locale Formatting**:
   - Change locale or call formatters: verify date/number formatting matches locale expectations, and `<html lang="...">` dynamically updates.

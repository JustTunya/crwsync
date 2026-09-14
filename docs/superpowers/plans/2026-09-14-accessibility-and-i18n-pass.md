# Accessibility & Internationalization Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a shared type-safe internationalization package (`@crwsync/i18n`) and implement a comprehensive WCAG 2.1 AA accessibility overhaul (color contrast, reduced motion, skip-to-content navigation, semantic landmarks, visible focus rings, ARIA labeling, form accessibility, and polite screen-reader live announcements) across `apps/frontend/web` and `apps/frontend/dash`.

**Architecture:** Create `@crwsync/i18n` with typed dictionary namespaces, React `I18nProvider`, `useTranslation()`, `useLocale()`, `useFormatters()`, and standard native `Intl` helpers; calibrate OKLCH design tokens in `packages/styles/src/globals.css`; build `SkipToContent` and `LiveAnnouncer` components; and systematically integrate accessible landmarks, focus indicators, and screen reader attributes across all web and dash pages.

**Tech Stack:** TypeScript, React 19, Next.js 16, Tailwind CSS v4, OKLCH Color Model, native `Intl` Web APIs, Vitest, Turborepo.

**Spec:** `docs/superpowers/specs/2026-09-14-accessibility-and-i18n-pass-design.md`

## Global Constraints

- Monorepo: `pnpm` workspaces with Turborepo caching.
- Coding style: double quotes, 2-space indentation, semicolons on statements, no unnecessary inline explanatory comments.
- Path aliases: `@crwsync/i18n`, `@crwsync/styles`, `@crwsync/types`.
- TypeScript `strict: true` across all packages and apps.
- A11y Standard: WCAG 2.1 AA (≥ 4.5:1 text contrast, ≥ 3:1 graphical element/border contrast, visible focus rings, complete keyboard navigability).
- i18n Strategy: zero third-party framework bloat; lightweight typed dictionaries with standard `Intl` browser APIs.

---

### Task 1: Create `@crwsync/i18n` Package

**Files:**
- Create: `packages/i18n/package.json`
- Create: `packages/i18n/tsconfig.json`
- Create: `packages/i18n/src/types.ts`
- Create: `packages/i18n/src/locales/en.ts`
- Create: `packages/i18n/src/locales/es.ts`
- Create: `packages/i18n/src/utils/format-date.ts`
- Create: `packages/i18n/src/utils/format-number.ts`
- Create: `packages/i18n/src/context/i18n.provider.tsx`
- Create: `packages/i18n/src/hooks/use-translation.ts`
- Create: `packages/i18n/src/hooks/use-locale.ts`
- Create: `packages/i18n/src/hooks/use-formatters.ts`
- Create: `packages/i18n/src/index.ts`
- Create: `packages/i18n/src/index.test.ts`

**Interfaces:**
- Produces:
  - `I18nProvider`: React provider component managing active locale, translations, and HTML attributes.
  - `useTranslation()`: Hook returning `{ t, locale, setLocale, dir }`.
  - `useLocale()`: Hook returning `{ locale, setLocale, dir, isRtl }`.
  - `useFormatters()`: Hook returning `{ formatDate, formatRelativeTime, formatNumber, formatCompactNumber }`.
  - `formatDate(date, options?, locale?)`: Formats dates using `Intl.DateTimeFormat`.
  - `formatRelativeTime(date, locale?)`: Formats relative timestamps using `Intl.RelativeTimeFormat`.
  - `formatNumber(value, options?, locale?)`: Formats numbers using `Intl.NumberFormat`.

- [ ] **Step 1: Write `package.json` and `tsconfig.json` for `packages/i18n`**

Create `packages/i18n/package.json`:
```json
{
  "name": "@crwsync/i18n",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.3",
    "vitest": "^3.0.0"
  }
}
```

Create `packages/i18n/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 2: Define types, locales, utils, context, and hooks in `packages/i18n`**

Create `packages/i18n/src/types.ts`:
```ts
export type SupportedLocale = "en" | "es";

export type TranslationDictionary = {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    close: string;
    confirm: string;
    back: string;
    next: string;
    skipToContent: string;
    actions: string;
    status: string;
    error: string;
    success: string;
    retry: string;
  };
  nav: {
    home: string;
    dashboard: string;
    features: string;
    architecture: string;
    about: string;
    contact: string;
    terms: string;
    privacy: string;
    signin: string;
    signup: string;
    settings: string;
    logout: string;
  };
  auth: {
    signinTitle: string;
    signupTitle: string;
    emailLabel: string;
    passwordLabel: string;
    forgotPassword: string;
    resetPassword: string;
    verifyEmailTitle: string;
  };
  dashboard: {
    workspaces: string;
    createWorkspace: string;
    modules: string;
    projects: string;
    activity: string;
    members: string;
  };
  kanban: {
    boardTitle: string;
    addTask: string;
    addColumn: string;
    filterTasks: string;
    taskDetails: string;
    comments: string;
    checklist: string;
    attachments: string;
  };
  chat: {
    placeholder: string;
    send: string;
    typingSingle: string;
    typingMultiple: string;
    onlineMembers: string;
  };
  settings: {
    profileTitle: string;
    workspaceSettings: string;
    dangerZone: string;
    deleteAccount: string;
    exportData: string;
  };
  a11y: {
    openMenu: string;
    closeMenu: string;
    toggleTheme: string;
    notifications: string;
    searchWorkspace: string;
    taskMoved: string;
    newMessage: string;
  };
};

export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationDictionary>;
```

Create `packages/i18n/src/locales/en.ts`:
```ts
import type { TranslationDictionary } from "../types";

export const en: TranslationDictionary = {
  common: {
    appName: "crwsync",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    close: "Close",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    skipToContent: "Skip to main content",
    actions: "Actions",
    status: "Status",
    error: "An error occurred",
    success: "Success",
    retry: "Retry"
  },
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    features: "Features",
    architecture: "Architecture",
    about: "About",
    contact: "Contact",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    signin: "Sign In",
    signup: "Sign Up",
    settings: "Settings",
    logout: "Log Out"
  },
  auth: {
    signinTitle: "Sign in to your account",
    signupTitle: "Create your crwsync account",
    emailLabel: "Email address",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    resetPassword: "Reset password",
    verifyEmailTitle: "Verify your email"
  },
  dashboard: {
    workspaces: "Workspaces",
    createWorkspace: "Create Workspace",
    modules: "Modules",
    projects: "Projects",
    activity: "Activity",
    members: "Members"
  },
  kanban: {
    boardTitle: "Kanban Board",
    addTask: "Add task",
    addColumn: "Add column",
    filterTasks: "Filter tasks",
    taskDetails: "Task details",
    comments: "Comments",
    checklist: "Checklist",
    attachments: "Attachments"
  },
  chat: {
    placeholder: "Type a message...",
    send: "Send message",
    typingSingle: "{user} is typing...",
    typingMultiple: "{users} are typing...",
    onlineMembers: "Online members"
  },
  settings: {
    profileTitle: "Profile Settings",
    workspaceSettings: "Workspace Settings",
    dangerZone: "Danger Zone",
    deleteAccount: "Delete Account",
    exportData: "Export Account Data"
  },
  a11y: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    notifications: "Notifications",
    searchWorkspace: "Search workspace (Ctrl+K)",
    taskMoved: "Task {title} moved to {column}",
    newMessage: "New message from {user}"
  }
};
```

Create `packages/i18n/src/locales/es.ts`:
```ts
import type { TranslationDictionary } from "../types";

export const es: TranslationDictionary = {
  common: {
    appName: "crwsync",
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Crear",
    search: "Buscar",
    close: "Cerrar",
    confirm: "Confirmar",
    back: "Atrás",
    next: "Siguiente",
    skipToContent: "Saltar al contenido principal",
    actions: "Acciones",
    status: "Estado",
    error: "Ocurrió un error",
    success: "Éxito",
    retry: "Reintentar"
  },
  nav: {
    home: "Inicio",
    dashboard: "Panel",
    features: "Características",
    architecture: "Arquitectura",
    about: "Acerca de",
    contact: "Contacto",
    terms: "Términos de servicio",
    privacy: "Política de privacidad",
    signin: "Iniciar sesión",
    signup: "Registrarse",
    settings: "Configuración",
    logout: "Cerrar sesión"
  },
  auth: {
    signinTitle: "Inicia sesión en tu cuenta",
    signupTitle: "Crea tu cuenta de crwsync",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    resetPassword: "Restablecer contraseña",
    verifyEmailTitle: "Verifica tu correo"
  },
  dashboard: {
    workspaces: "Espacios de trabajo",
    createWorkspace: "Crear espacio",
    modules: "Módulos",
    projects: "Proyectos",
    activity: "Actividad",
    members: "Miembros"
  },
  kanban: {
    boardTitle: "Tablero Kanban",
    addTask: "Añadir tarea",
    addColumn: "Añadir columna",
    filterTasks: "Filtrar tareas",
    taskDetails: "Detalles de la tarea",
    comments: "Comentarios",
    checklist: "Lista de verificación",
    attachments: "Archivos adjuntos"
  },
  chat: {
    placeholder: "Escribe un mensaje...",
    send: "Enviar mensaje",
    typingSingle: "{user} está escribiendo...",
    typingMultiple: "{users} están escribiendo...",
    onlineMembers: "Miembros en línea"
  },
  settings: {
    profileTitle: "Configuración de perfil",
    workspaceSettings: "Configuración del espacio",
    dangerZone: "Zona de peligro",
    deleteAccount: "Eliminar cuenta",
    exportData: "Exportar datos de cuenta"
  },
  a11y: {
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    toggleTheme: "Alternar tema",
    notifications: "Notificaciones",
    searchWorkspace: "Buscar en espacio (Ctrl+K)",
    taskMoved: "Tarea {title} movida a {column}",
    newMessage: "Nuevo mensaje de {user}"
  }
};
```

Create `packages/i18n/src/utils/format-date.ts`:
```ts
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale = "en"
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatRelativeTime(
  date: Date | string | number,
  locale = "en"
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffInSeconds = Math.round((d.getTime() - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
  const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];
  const unitIndex = cutoffs.findIndex((cutoff) => Math.abs(diffInSeconds) < cutoff);
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

  return rtf.format(Math.round(diffInSeconds / divisor), units[unitIndex]);
}
```

Create `packages/i18n/src/utils/format-number.ts`:
```ts
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = "en"
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCompactNumber(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
```

Create `packages/i18n/src/context/i18n.provider.tsx`:
```tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { SupportedLocale, TranslationKey, TranslationDictionary } from "../types";
import { en } from "../locales/en";
import { es } from "../locales/es";

const dictionaries: Record<SupportedLocale, TranslationDictionary> = { en, es };

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj) || path;
}

export function I18nProvider({
  children,
  defaultLocale = "en"
}: {
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("crwsync_locale") as SupportedLocale;
      if (saved && dictionaries[saved]) {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("crwsync_locale", newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === ("ar" as any) ? "rtl" : "ltr";
    } catch {}
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === ("ar" as any) ? "rtl" : "ltr";
    }
  }, [locale]);

  const t = useMemo(() => {
    const dict = dictionaries[locale] || dictionaries.en;
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text = getNestedValue(dict, key);
      if (typeof text !== "string") {
        text = getNestedValue(dictionaries.en, key);
      }
      if (typeof text !== "string") return key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir: "ltr" as const,
      isRtl: false
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
```

Create `packages/i18n/src/hooks/use-translation.ts`:
```ts
import { useI18n } from "../context/i18n.provider";

export function useTranslation() {
  const { t, locale, setLocale, dir, isRtl } = useI18n();
  return { t, locale, setLocale, dir, isRtl };
}
```

Create `packages/i18n/src/hooks/use-locale.ts`:
```ts
import { useI18n } from "../context/i18n.provider";

export function useLocale() {
  const { locale, setLocale, dir, isRtl } = useI18n();
  return { locale, setLocale, dir, isRtl };
}
```

Create `packages/i18n/src/hooks/use-formatters.ts`:
```ts
import { useI18n } from "../context/i18n.provider";
import { formatDate as fd, formatRelativeTime as frt } from "../utils/format-date";
import { formatNumber as fn, formatCompactNumber as fcn } from "../utils/format-number";

export function useFormatters() {
  const { locale } = useI18n();

  return {
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      fd(date, options, locale),
    formatRelativeTime: (date: Date | string | number) =>
      frt(date, locale),
    formatNumber: (val: number, options?: Intl.NumberFormatOptions) =>
      fn(val, options, locale),
    formatCompactNumber: (val: number) =>
      fcn(val, locale)
  };
}
```

Create `packages/i18n/src/index.ts`:
```ts
export * from "./types";
export * from "./locales/en";
export * from "./locales/es";
export * from "./context/i18n.provider";
export * from "./hooks/use-translation";
export * from "./hooks/use-locale";
export * from "./hooks/use-formatters";
export * from "./utils/format-date";
export * from "./utils/format-number";
```

- [ ] **Step 3: Write unit tests in `packages/i18n/src/index.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { formatDate, formatRelativeTime } from "./utils/format-date";
import { formatNumber, formatCompactNumber } from "./utils/format-number";

describe("i18n package", () => {
  it("has matching translation keys across locales", () => {
    expect(Object.keys(en)).toEqual(Object.keys(es));
    expect(Object.keys(en.common)).toEqual(Object.keys(es.common));
    expect(Object.keys(en.auth)).toEqual(Object.keys(es.auth));
  });

  it("formats dates and numbers correctly", () => {
    const date = new Date("2026-09-14T12:00:00Z");
    const formatted = formatDate(date, { year: "numeric", month: "numeric", day: "numeric" }, "en");
    expect(formatted).toBeTruthy();

    const num = formatNumber(12500, undefined, "en");
    expect(num).toContain("12,500");

    const compact = formatCompactNumber(1500000, "en");
    expect(compact).toMatch(/1\.5M|1\.5\s*M/);
  });
});
```

- [ ] **Step 4: Run tests & verify**
Run: `pnpm --filter @crwsync/i18n run test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/i18n
git commit -m "feat(i18n): create @crwsync/i18n shared localization package"
```

---

### Task 2: Calibrate OKLCH Contrast Tokens & Add Reduced-Motion in `packages/styles`

**Files:**
- Modify: `packages/styles/src/globals.css:80-160`

**Interfaces:**
- Produces:
  - Accessible `--muted-foreground` and `--placeholder` OKLCH values for WCAG 2.1 AA (≥ 4.5:1 ratio).
  - Global `@media (prefers-reduced-motion: reduce)` accessibility rule.

- [ ] **Step 1: Update OKLCH tokens and reduced motion in `packages/styles/src/globals.css`**

Ensure light mode and dark mode tokens are calibrated for contrast:
In `:root`:
- `--muted-foreground`: `oklch(0.42 0.016 49.76);`
- `--placeholder`: `oklch(0.50 0.020 64.35);`

In `.dark`:
- `--muted-foreground`: `oklch(0.72 0.016 49.76);`
- `--placeholder`: `oklch(0.65 0.020 64.35);`

Add at the bottom of `packages/styles/src/globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add packages/styles/src/globals.css
git commit -m "style(a11y): calibrate contrast tokens and add prefers-reduced-motion support"
```

---

### Task 3: Build Shared `SkipToContent` and `LiveAnnouncer`

**Files:**
- Create: `apps/frontend/dash/components/a11y/skip-to-content.tsx`
- Create: `apps/frontend/dash/components/a11y/live-announcer.tsx`
- Create: `apps/frontend/web/components/a11y/skip-to-content.tsx`

**Interfaces:**
- Produces:
  - `SkipToContent`: Accessible skip link jumping focus to `#main-content`.
  - `LiveAnnouncer` & `useAnnounce()`: Screen reader live region dispatching polite announcements (`role="status"`, `aria-live="polite"`).

- [ ] **Step 1: Create `SkipToContent` component in `dash` and `web`**

Create `apps/frontend/web/components/a11y/skip-to-content.tsx`:
```tsx
"use client";

import React from "react";
import { useTranslation } from "@crwsync/i18n";

export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {t("common.skipToContent")}
    </a>
  );
}
```

Create `apps/frontend/dash/components/a11y/skip-to-content.tsx` with identical component signature.

- [ ] **Step 2: Create `LiveAnnouncer` and `useAnnounce` in `apps/frontend/dash/components/a11y/live-announcer.tsx`**

```tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AnnounceContextValue {
  announce: (message: string) => void;
}

const AnnounceContext = createContext<AnnounceContextValue | null>(null);

export function LiveAnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string>("");

  const announce = useCallback((msg: string) => {
    setMessage("");
    setTimeout(() => {
      setMessage(msg);
    }, 50);
  }, []);

  return (
    <AnnounceContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce() {
  const ctx = useContext(AnnounceContext);
  return ctx || { announce: () => {} };
}
```

- [ ] **Step 3: Commit**
```bash
git add apps/frontend/web/components/a11y apps/frontend/dash/components/a11y
git commit -m "feat(a11y): add SkipToContent and LiveAnnouncer components"
```

---

### Task 4: Integrate `@crwsync/i18n`, Landmarks, and Form Accessibility in `apps/frontend/web`

**Files:**
- Modify: `apps/frontend/web/package.json` (add `@crwsync/i18n`)
- Modify: `apps/frontend/web/app/layout.tsx` (wrap with `I18nProvider`, add `SkipToContent`)
- Modify: `apps/frontend/web/components/home/header.tsx` (`<header role="banner">`, `<nav aria-label="Main Navigation">`, aria labels)
- Modify: `apps/frontend/web/components/home/footer.tsx` (`<footer role="contentinfo">`)
- Modify: `apps/frontend/web/app/page.tsx` (`<main id="main-content">`)
- Modify: `apps/frontend/web/components/ui/button.tsx` (ensure visible focus ring tokens)
- Modify: `apps/frontend/web/components/ui/input.tsx` (ensure visible focus ring tokens and aria attributes)
- Modify: `apps/frontend/web/components/signin-form.tsx` (explicit `<label htmlFor="...">`, `aria-invalid`, `aria-describedby`)
- Modify: `apps/frontend/web/components/signup-form.tsx` (explicit `<label htmlFor="...">`, `aria-invalid`, `aria-describedby`)

- [ ] **Step 1: Add `@crwsync/i18n` dependency to `apps/frontend/web/package.json`**
Add `"@crwsync/i18n": "workspace:*"` to dependencies.

- [ ] **Step 2: Update `apps/frontend/web/app/layout.tsx`**
Wrap with `I18nProvider` and render `<SkipToContent />`.

- [ ] **Step 3: Update `apps/frontend/web/components/home/header.tsx` and `footer.tsx` with semantic landmarks and ARIA attributes**
Ensure `<header role="banner">`, `<nav aria-label="Main navigation">`, theme switcher `aria-label="Toggle theme"`, mobile menu button `aria-label="Toggle navigation menu"`, `aria-expanded`, and `<footer role="contentinfo">`.

- [ ] **Step 4: Update `apps/frontend/web/components/ui/button.tsx` and `input.tsx`**
Ensure `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none`.

- [ ] **Step 5: Audit and connect auth forms in `signin-form.tsx` and `signup-form.tsx`**
Connect `htmlFor` with `id`, attach `aria-invalid={!!errors.field}` and `aria-describedby="error-id"`.

- [ ] **Step 6: Run `pnpm --filter @crwsync/web typecheck`**
Expected: PASS

- [ ] **Step 7: Commit**
```bash
git add apps/frontend/web
git commit -m "feat(web): integrate i18n, landmarks, and accessible form controls"
```

---

### Task 5: Integrate `@crwsync/i18n`, `LiveAnnouncer`, Focus Rings, and ARIA in `apps/frontend/dash`

**Files:**
- Modify: `apps/frontend/dash/package.json` (add `@crwsync/i18n`)
- Modify: `apps/frontend/dash/app/layout.tsx` (wrap with `I18nProvider` and `LiveAnnouncerProvider`, add `SkipToContent`)
- Modify: `apps/frontend/dash/components/l-sidebar.tsx` (`<aside aria-label="Workspace Sidebar">`, icon button aria-labels)
- Modify: `apps/frontend/dash/components/r-sidebar.tsx` (`<aside aria-label="Context Sidebar">`)
- Modify: `apps/frontend/dash/components/ui/button.tsx`, `input.tsx`, `checkbox.tsx`, `toggle.tsx` (focus rings)
- Modify: `apps/frontend/dash/components/search/OmniSearchModal.tsx` (accessible dialog roles, keyboard trap, search trigger aria-label)
- Modify: `apps/frontend/dash/components/notifications.tsx` (notification trigger `aria-label="Notifications"`)
- Modify: `apps/frontend/dash/components/kanban/KanbanTask.tsx` (`role="article"`, `tabIndex={0}`, keyboard Enter/Space activation, `aria-label`)
- Modify: `apps/frontend/dash/components/chat/ChatRoom.tsx` (wire `useAnnounce` for incoming chat messages and typing indicator aria-live)

- [ ] **Step 1: Add `@crwsync/i18n` dependency to `apps/frontend/dash/package.json`**
Add `"@crwsync/i18n": "workspace:*"` to dependencies.

- [ ] **Step 2: Update `apps/frontend/dash/app/layout.tsx`**
Wrap providers with `I18nProvider` and `LiveAnnouncerProvider`, and add `<SkipToContent />`.

- [ ] **Step 3: Update `l-sidebar.tsx`, `r-sidebar.tsx`, and main layout shells with semantic landmarks**
`<aside aria-label="Workspace navigation">`, `<main id="main-content">`, `<header role="banner">`.

- [ ] **Step 4: Update UI primitives for visible focus rings**
Standardize `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none` across `Button`, `Input`, `Checkbox`, `Toggle`, `Select`.

- [ ] **Step 5: Enhance Kanban task keyboard navigation and ARIA**
In `KanbanTask.tsx`, add `tabIndex={0}`, `role="article"`, `aria-label={`Task: ${task.title}, Column: ${columnName}`}`, and onKeyDown handler for Enter/Space to open details.

- [ ] **Step 6: Enhance Chat and Notifications with live announcements and ARIA**
In `ChatRoom.tsx` and `notifications.tsx`, ensure message inputs have descriptive labels, emoji buttons have `aria-label="Add reaction"`, and new incoming events call `announce(...)`.

- [ ] **Step 7: Run `pnpm --filter @crwsync/dash test` and `pnpm --filter @crwsync/dash typecheck`**
Expected: PASS

- [ ] **Step 8: Commit**
```bash
git add apps/frontend/dash
git commit -m "feat(dash): integrate i18n, live announcements, and keyboard accessible kanban & chat"
```

---

### Task 6: Full Workspace Verification & ROADMAP.md Update

**Files:**
- Modify: `ROADMAP.md:331-332`

- [ ] **Step 1: Run workspace typecheck, lint, and tests**
Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS across all packages and apps.

- [ ] **Step 2: Update `ROADMAP.md`**
Mark `* [x] **Accessibility & Internationalization Pass**` as completed.

- [ ] **Step 3: Commit and verify clean status**
```bash
git add ROADMAP.md
git commit -m "docs: complete accessibility and internationalization pass in roadmap"
```

# Observability & Error Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Sentry error tracking across `apps/backend`, `apps/frontend/web`, and `apps/frontend/dash`; replace the backend's console logger with structured JSON logging; ship branded crash pages on both Next.js apps; wire source-map upload into CI.

**Architecture:** One Sentry project per deployable app (backend, web, dash) — 3 DSNs, one shared org. Backend captures exceptions from the existing `AllExceptionsFilter` (no new filter). Backend logs become structured JSON via `nestjs-pino`, which is a drop-in replacement for Nest's `Logger` (every existing `new Logger(X.name)` call site keeps working). Both Next.js apps get the standard `@sentry/nextjs` App Router setup plus a branded `error.tsx`/`global-error.tsx` pair built from existing `GlassBox`/`Button` components. CI uploads source maps for all three apps on push to `main`, gated to no-op when the Sentry secrets aren't configured (so a fork/local build never breaks).

**Tech Stack:** `@sentry/nestjs`, `@sentry/nextjs`, `nestjs-pino` + `pino-http`, `@sentry/cli` (CI only). No new infrastructure/containers.

**Spec:** `docs/superpowers/specs/2026-09-13-observability-error-tracking-design.md`

## Global Constraints

- No inline/block comments except a trailing unit comment on a magic number (house style, `CLAUDE.md`).
- Double quotes, 2-space indentation, semicolons — matches existing formatting exactly.
- Absolute imports via path aliases (`@/…` per Next.js app, `src/…` in the backend) — never deep relative imports.
- `strict: true` TypeScript — no `any`.
- `SENTRY_DSN` (backend) and `NEXT_PUBLIC_SENTRY_DSN` (frontends) must be optional at runtime — an unset DSN means the SDK is inert, never a boot-time failure. Do not add them to `main.ts`'s `requiredEnvVars` fail-fast list.
- `AllExceptionsFilter` is the only place backend exceptions get reported to Sentry — no per-controller or per-service `captureException` calls.
- Every existing `new Logger(SomeClass.name)` call site across the backend must keep working unchanged after the logging swap.
- Frontend error pages reuse `GlassBox`, `Button`/`buttonVariants`, `lucide-react`, and the existing Figtree/Tailwind token set from `DESIGN.md` — no new visual components or a new icon library.
- CI/Dockerfile changes must be no-ops (skip cleanly) when Sentry secrets are absent, so unrelated PRs and forks keep building.

---

### Task 1: Backend — Sentry SDK init & module wiring

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/instrument.ts`
- Modify: `apps/backend/src/main.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/.env.example`

**Interfaces:**
- Produces: `src/instrument.ts` — Sentry SDK initialized as a side effect of import, no exports consumed elsewhere.

- [ ] **Step 1: Install `@sentry/nestjs`**

Run: `pnpm --filter @crwsync/backend add @sentry/nestjs`

- [ ] **Step 2: Create the instrumentation entrypoint**

Create `apps/backend/src/instrument.ts`:

```ts
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
  release: process.env.SENTRY_RELEASE,
});
```

- [ ] **Step 3: Import it first in `main.ts`**

`apps/backend/src/main.ts` currently starts with:

```ts
import { ClassSerializerInterceptor, Logger, ValidationPipe } from "@nestjs/common";
```

Change the top of the file to:

```ts
import "src/instrument";

import { ClassSerializerInterceptor, Logger, ValidationPipe } from "@nestjs/common";
```

This must stay the literal first line of the file — Sentry's Node SDK instruments other modules as they're `require`d, so it has to run before anything else does.

- [ ] **Step 4: Register `SentryModule` in `AppModule`**

In `apps/backend/src/app.module.ts`, add the import:

```ts
import { SentryModule } from "@sentry/nestjs/setup";
```

And make it the first entry in the `imports` array:

```ts
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // ...unchanged
  ],
```

- [ ] **Step 5: Document the new env vars**

Append to `apps/backend/.env.example`:

```
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=
```

- [ ] **Step 6: Verify the app still boots**

Run: `pnpm --filter @crwsync/backend run typecheck`
Expected: no errors. (`SENTRY_DSN` is unset locally, so `Sentry.init` runs with `dsn: undefined` — the SDK stays inert, this is expected and correct.)

- [ ] **Step 7: Commit**

```bash
git add apps/backend/package.json apps/backend/src/instrument.ts apps/backend/src/main.ts apps/backend/src/app.module.ts apps/backend/.env.example
git commit -m "feat(backend): initialize Sentry SDK"
```

---

### Task 2: Backend — report unexpected errors to Sentry from `AllExceptionsFilter`

**Files:**
- Modify: `apps/backend/src/common/filters/all-exceptions.filter.ts`
- Test: `apps/backend/src/common/filters/all-exceptions.filter.spec.ts`

**Interfaces:**
- Consumes: `Sentry.captureException` from `@sentry/nestjs` (installed in Task 1).

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/common/filters/all-exceptions.filter.spec.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { AllExceptionsFilter } from "./all-exceptions.filter";

jest.mock("@sentry/nestjs", () => ({ captureException: jest.fn() }));

function makeHost(req: { method: string; url: string }) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  };
  return { host: host as any, status };
}

describe("AllExceptionsFilter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports an unexpected 500-class error to Sentry", () => {
    const filter = new AllExceptionsFilter();
    const { host, status } = makeHost({ method: "GET", url: "/boom" });

    filter.catch(new Error("boom"), host);

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it("does not report an expected 4xx HttpException to Sentry", () => {
    const filter = new AllExceptionsFilter();
    const { host, status } = makeHost({ method: "POST", url: "/login" });

    filter.catch(new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED), host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @crwsync/backend test -- all-exceptions.filter`
Expected: FAIL — `Sentry.captureException` is never called because the filter doesn't call it yet.

- [ ] **Step 3: Update the filter**

Modify `apps/backend/src/common/filters/all-exceptions.filter.ts`:

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request } from "express";
import * as Sentry from "@sentry/nestjs";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    const rawUrl = req.originalUrl || req.url || "";
    const path = req.path || rawUrl.split("?")[0] || rawUrl;

    this.logger.error(`[${req.method}] ${path} -> ${status}`);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Sentry.captureException(exception);
    }

    res.status(status).json({
      statusCode: status,
      path,
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @crwsync/backend test -- all-exceptions.filter`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/common/filters/all-exceptions.filter.ts apps/backend/src/common/filters/all-exceptions.filter.spec.ts
git commit -m "feat(backend): report unhandled 5xx errors to Sentry from AllExceptionsFilter"
```

---

### Task 3: Backend — structured JSON logging via `nestjs-pino`

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/main.ts`
- Delete: `apps/backend/src/common/interceptors/logging.interceptor.ts`

**Interfaces:**
- Produces: app-wide structured logging — every existing `new Logger(X.name)` call site is unaffected.

- [ ] **Step 1: Install dependencies**

Run: `pnpm --filter @crwsync/backend add nestjs-pino pino-http`

- [ ] **Step 2: Register `LoggerModule` in `AppModule`**

Add the import to `apps/backend/src/app.module.ts`:

```ts
import { LoggerModule } from "nestjs-pino";
```

Add it to `imports`, after `SentryModule.forRoot()`:

```ts
  imports: [
    SentryModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || "info",
        redact: ["req.headers.cookie", "req.headers.authorization"],
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    // ...unchanged
  ],
```

- [ ] **Step 3: Swap the app logger in `main.ts`**

Add the import (aliased — `Logger` from `@nestjs/common` is already used for the bootstrap logger):

```ts
import { Logger as PinoLogger } from "nestjs-pino";
```

Right after `const reflector = app.get(Reflector);`, add:

```ts
  app.useLogger(app.get(PinoLogger));
```

- [ ] **Step 4: Remove the now-redundant `LoggingInterceptor`**

`nestjs-pino`'s `pino-http` middleware logs one structured line per request/response automatically — the hand-rolled interceptor duplicates that.

Delete `apps/backend/src/common/interceptors/logging.interceptor.ts`.

Remove its import and usage from `apps/backend/src/main.ts`:

```ts
import { LoggingInterceptor } from "src/common/interceptors/logging.interceptor";
```

and in `useGlobalInterceptors`:

```ts
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new TimeoutInterceptor(10000)
  );
```

(drop `new LoggingInterceptor()` from the list).

- [ ] **Step 5: Verify the backend still builds and boots locally**

Run: `pnpm --filter @crwsync/backend run typecheck`
Expected: no errors.

Run: `pnpm --filter @crwsync/backend run start:dev` (with a local `.env` pointing at a running dev DB/Redis per `docker-compose.dev.yml`), confirm log lines print as single-line JSON objects instead of the old colored Nest console format, then stop it (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/package.json apps/backend/src/app.module.ts apps/backend/src/main.ts
git rm apps/backend/src/common/interceptors/logging.interceptor.ts
git commit -m "feat(backend): structured JSON logging via nestjs-pino"
```

---

### Task 4: Backend — enable source maps for CI upload

**Files:**
- Modify: `apps/backend/tsconfig.json`

**Interfaces:**
- Produces: `.js.map` files alongside `apps/backend/dist/**/*.js` after `pnpm --filter @crwsync/backend run build` — consumed by the CI source-map upload step in Task 9.

- [ ] **Step 1: Turn on source maps**

In `apps/backend/tsconfig.json`, add `"sourceMap": true` to `compilerOptions`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "baseUrl": "./",
    "sourceMap": true,
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"],
}
```

- [ ] **Step 2: Verify maps are emitted**

Run: `pnpm --filter @crwsync/backend run build`
Expected: `apps/backend/dist/main.js.map` exists alongside `apps/backend/dist/main.js`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tsconfig.json
git commit -m "build(backend): emit source maps for Sentry upload"
```

---

### Task 5: Web — Sentry SDK wiring

**Files:**
- Modify: `apps/frontend/web/package.json`
- Create: `apps/frontend/web/sentry.client.config.ts`
- Create: `apps/frontend/web/sentry.server.config.ts`
- Create: `apps/frontend/web/sentry.edge.config.ts`
- Create: `apps/frontend/web/instrumentation.ts`
- Modify: `apps/frontend/web/next.config.ts`
- Create: `apps/frontend/web/.env.example`

**Interfaces:**
- Produces: Sentry initialized in all three Next.js runtimes; `withSentryConfig`-wrapped build for later source-map upload (Task 9).

- [ ] **Step 1: Install `@sentry/nextjs`**

Run: `pnpm --filter @crwsync/web add @sentry/nextjs`

- [ ] **Step 2: Add the client/server/edge config files**

Create `apps/frontend/web/sentry.client.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

Create `apps/frontend/web/sentry.server.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

Create `apps/frontend/web/sentry.edge.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

- [ ] **Step 3: Register server/edge configs via `instrumentation.ts`**

Create `apps/frontend/web/instrumentation.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

- [ ] **Step 4: Wrap `next.config.ts` with `withSentryConfig`**

Modify `apps/frontend/web/next.config.ts` — add the import and wrap the export:

```ts
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  // ...unchanged (typescript, devIndicators, compress, images, headers, output)
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
```

- [ ] **Step 5: Document the runtime env var**

Create `apps/frontend/web/.env.example`:

```
NEXT_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 6: Verify the app still builds**

Run: `NEXT_NO_STANDALONE=1 pnpm --filter @crwsync/web run build`
Expected: build succeeds (no `SENTRY_AUTH_TOKEN` set locally, so `withSentryConfig` skips the source-map upload step and just logs a notice — this is expected).

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/web/package.json apps/frontend/web/sentry.client.config.ts apps/frontend/web/sentry.server.config.ts apps/frontend/web/sentry.edge.config.ts apps/frontend/web/instrumentation.ts apps/frontend/web/next.config.ts apps/frontend/web/.env.example
git commit -m "feat(web): initialize Sentry SDK"
```

---

### Task 6: Web — branded error boundaries

**Files:**
- Create: `apps/frontend/web/app/error.tsx`
- Create: `apps/frontend/web/app/global-error.tsx`

**Interfaces:**
- Consumes: `GlassBox` from `@/components/ui/glassbox`, `Button`/`buttonVariants` from `@/components/ui/button`.

- [ ] **Step 1: Build the segment-level error boundary**

Create `apps/frontend/web/app/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { GlassBox } from "@/components/ui/glassbox";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4">
      <GlassBox className="gap-4 text-center">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
          <AlertTriangle className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            An unexpected error occurred. Our team has been notified and is looking into it.
          </p>
        </div>
        {error.digest && (
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
            Error ref: {error.digest}
          </span>
        )}
        <div className="flex gap-3 pt-2">
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Go home
          </Link>
          <Button size="sm" onClick={() => reset()}>Try again</Button>
        </div>
      </GlassBox>
    </div>
  );
}
```

- [ ] **Step 2: Build the root-layout fallback**

Create `apps/frontend/web/app/global-error.tsx`. This one can't assume the root layout's providers or font mounted, so it renders its own `<html><body>` and re-imports the stylesheet/font directly:

```tsx
"use client";

import { useEffect } from "react";
import { Figtree } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { GlassBox } from "@/components/ui/glassbox";
import { Button, buttonVariants } from "@/components/ui/button";
import "@crwsync/styles";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${figtree.variable} font-figtree antialiased`}>
        <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4">
          <GlassBox className="gap-4 text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
              <AlertTriangle className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                An unexpected error occurred while loading the page. Our team has been notified.
              </p>
            </div>
            {error.digest && (
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                Error ref: {error.digest}
              </span>
            )}
            <div className="flex gap-3 pt-2">
              <a href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>Go home</a>
              <Button size="sm" onClick={() => reset()}>Try again</Button>
            </div>
          </GlassBox>
        </div>
      </body>
    </html>
  );
}
```

Note: this file uses a plain `<a href="/">` rather than `next/link`, since a crash at the root layout may mean the router itself is in a bad state — a full navigation is the safer recovery path here.

- [ ] **Step 2: Verify with a temporary crash**

Temporarily add `throw new Error("test error.tsx");` as the first line of `apps/frontend/web/app/page.tsx`'s component body, run `pnpm --filter @crwsync/web run dev`, load `/`, confirm the branded page renders (not Next's default overlay) and "Try again" is clickable. Remove the temporary throw.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/web/app/error.tsx apps/frontend/web/app/global-error.tsx
git commit -m "feat(web): add branded error boundaries"
```

---

### Task 7: Dash — Sentry SDK wiring

**Files:**
- Modify: `apps/frontend/dash/package.json`
- Create: `apps/frontend/dash/sentry.client.config.ts`
- Create: `apps/frontend/dash/sentry.server.config.ts`
- Create: `apps/frontend/dash/sentry.edge.config.ts`
- Create: `apps/frontend/dash/instrumentation.ts`
- Modify: `apps/frontend/dash/next.config.ts`
- Create: `apps/frontend/dash/.env.example`

**Interfaces:**
- Identical shape to Task 5, mirrored for the dashboard app.

- [ ] **Step 1: Install `@sentry/nextjs`**

Run: `pnpm --filter @crwsync/dash add @sentry/nextjs`

- [ ] **Step 2: Add the client/server/edge config files**

Create `apps/frontend/dash/sentry.client.config.ts`, `apps/frontend/dash/sentry.server.config.ts`, and `apps/frontend/dash/sentry.edge.config.ts` — all three identical:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

- [ ] **Step 3: Register server/edge configs via `instrumentation.ts`**

Create `apps/frontend/dash/instrumentation.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

- [ ] **Step 4: Wrap `next.config.ts` with `withSentryConfig`**

Modify `apps/frontend/dash/next.config.ts`:

```ts
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  // ...unchanged
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
```

- [ ] **Step 5: Document the runtime env var**

Create `apps/frontend/dash/.env.example`:

```
NEXT_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 6: Verify the app still builds**

Run: `NEXT_NO_STANDALONE=1 pnpm --filter @crwsync/dash run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/dash/package.json apps/frontend/dash/sentry.client.config.ts apps/frontend/dash/sentry.server.config.ts apps/frontend/dash/sentry.edge.config.ts apps/frontend/dash/instrumentation.ts apps/frontend/dash/next.config.ts apps/frontend/dash/.env.example
git commit -m "feat(dash): initialize Sentry SDK"
```

---

### Task 8: Dash — branded error boundaries

**Files:**
- Create: `apps/frontend/dash/app/error.tsx`
- Create: `apps/frontend/dash/app/global-error.tsx`

**Interfaces:**
- Same components as Task 6. "Go home" links to `/`, which `apps/frontend/dash/app/page.tsx` already resolves to the user's last-active workspace (or `/create-workspace`) — no need to duplicate that lookup here.

- [ ] **Step 1: Build the segment-level error boundary**

Create `apps/frontend/dash/app/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { GlassBox } from "@/components/ui/glassbox";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4">
      <GlassBox className="gap-4 text-center">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
          <AlertTriangle className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            An unexpected error occurred. Our team has been notified and is looking into it.
          </p>
        </div>
        {error.digest && (
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
            Error ref: {error.digest}
          </span>
        )}
        <div className="flex gap-3 pt-2">
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Go home
          </Link>
          <Button size="sm" onClick={() => reset()}>Try again</Button>
        </div>
      </GlassBox>
    </div>
  );
}
```

- [ ] **Step 2: Build the root-layout fallback**

Create `apps/frontend/dash/app/global-error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { Figtree } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { GlassBox } from "@/components/ui/glassbox";
import { Button, buttonVariants } from "@/components/ui/button";
import "@crwsync/styles";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${figtree.variable} font-figtree antialiased`}>
        <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4">
          <GlassBox className="gap-4 text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
              <AlertTriangle className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                An unexpected error occurred while loading the page. Our team has been notified.
              </p>
            </div>
            {error.digest && (
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                Error ref: {error.digest}
              </span>
            )}
            <div className="flex gap-3 pt-2">
              <a href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>Go home</a>
              <Button size="sm" onClick={() => reset()}>Try again</Button>
            </div>
          </GlassBox>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify with a temporary crash**

Temporarily add `throw new Error("test error.tsx");` as the first line of `apps/frontend/dash/app/[slug]/page.tsx`'s component body (or another authenticated route), sign in, navigate to it, confirm the branded page renders. Remove the temporary throw.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/app/error.tsx apps/frontend/dash/app/global-error.tsx
git commit -m "feat(dash): add branded error boundaries"
```

---

### Task 9: CI/CD — source-map upload wiring

**Files:**
- Modify: `package.json` (root)
- Modify: `.github/workflows/deploy.yml`
- Modify: `apps/frontend/web/Dockerfile`
- Modify: `apps/frontend/dash/Dockerfile`

**Interfaces:**
- Consumes: `apps/backend/dist/**/*.js.map` (Task 4), `withSentryConfig` in both Next.js configs (Tasks 5 & 7).
- New GitHub repo secrets this task assumes will be created (document for the user, not created by this task): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT_BACKEND`, `SENTRY_PROJECT_WEB`, `SENTRY_PROJECT_DASH`, `SENTRY_DSN` (backend runtime), `NEXT_PUBLIC_SENTRY_DSN_WEB`, `NEXT_PUBLIC_SENTRY_DSN_DASH`.

- [ ] **Step 1: Add `@sentry/cli` as a root dev dependency**

Run: `pnpm add -Dw @sentry/cli`

(`-w` targets the workspace root, matching where `turbo`/`eslint`/`prettier` already live as shared build tooling.)

- [ ] **Step 2: Add the backend source-map step to the `test` job**

In `.github/workflows/deploy.yml`, add a new step at the end of the `test` job (after "Lint, typecheck & test project"):

```yaml
      - name: Build backend & upload source maps to Sentry
        if: github.event_name == 'push' && secrets.SENTRY_AUTH_TOKEN != ''
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT_BACKEND }}
        run: |
          pnpm --filter @crwsync/backend run build
          pnpm exec sentry-cli sourcemaps inject apps/backend/dist
          pnpm exec sentry-cli sourcemaps upload --release=${{ github.sha }} apps/backend/dist
```

This runs on the GitHub runner directly (not inside the backend's Docker build) — the compiled `dist/` here only exists to extract and upload maps; it's discarded when the job ends and never reaches the runtime image.

- [ ] **Step 3: Pass Sentry build args/secrets into the `build` job matrix**

In the same file, extend the `build` job's `build-args` block:

```yaml
          build-args: |
            NEXT_PUBLIC_API_URL=${{ (matrix.app == 'web' || matrix.app == 'dash') && secrets.NEXT_PUBLIC_API_URL || '' }}
            NEXT_PUBLIC_DASH_URL=${{ matrix.app == 'web' && secrets.NEXT_PUBLIC_DASH_URL || '' }}
            NEXT_PUBLIC_WEB_URL=${{ matrix.app == 'dash' && secrets.NEXT_PUBLIC_WEB_URL || '' }}
            NEXT_PUBLIC_DEMO_IDENTIFIER=${{ matrix.app == 'web' && secrets.NEXT_PUBLIC_DEMO_IDENTIFIER || '' }}
            NEXT_PUBLIC_DEMO_PASSWORD=${{ matrix.app == 'web' && secrets.NEXT_PUBLIC_DEMO_PASSWORD || '' }}
            NEXT_PUBLIC_SENTRY_DSN=${{ (matrix.app == 'web' && secrets.NEXT_PUBLIC_SENTRY_DSN_WEB) || (matrix.app == 'dash' && secrets.NEXT_PUBLIC_SENTRY_DSN_DASH) || '' }}
            SENTRY_ORG=${{ (matrix.app == 'web' || matrix.app == 'dash') && secrets.SENTRY_ORG || '' }}
            SENTRY_PROJECT=${{ (matrix.app == 'web' && secrets.SENTRY_PROJECT_WEB) || (matrix.app == 'dash' && secrets.SENTRY_PROJECT_DASH) || '' }}
            SENTRY_RELEASE=${{ (matrix.app == 'web' || matrix.app == 'dash') && github.sha || '' }}
          # Expose the database URL and Sentry auth token using build-time secure context isolation
          secrets: |
            ${{ matrix.app == 'backend' && format('DATABASE_URL={0}', secrets.DATABASE_URL) || '' }}
            ${{ (matrix.app == 'web' || matrix.app == 'dash') && format('SENTRY_AUTH_TOKEN={0}', secrets.SENTRY_AUTH_TOKEN) || '' }}
```

- [ ] **Step 4: Wire the `SENTRY_AUTH_TOKEN` secret and build args into the web Dockerfile**

Modify `apps/frontend/web/Dockerfile` — replace:

```dockerfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DASH_URL
ARG NEXT_PUBLIC_DEMO_IDENTIFIER
ARG NEXT_PUBLIC_DEMO_PASSWORD
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DASH_URL=${NEXT_PUBLIC_DASH_URL}
ENV NEXT_PUBLIC_DEMO_IDENTIFIER=${NEXT_PUBLIC_DEMO_IDENTIFIER}
ENV NEXT_PUBLIC_DEMO_PASSWORD=${NEXT_PUBLIC_DEMO_PASSWORD}

RUN --mount=type=cache,id=turbo,target=/app/node_modules/.cache/turbo \
    --mount=type=cache,id=next-web,target=/app/apps/frontend/web/.next/cache \
    pnpm turbo run build --filter=@crwsync/web...
```

with:

```dockerfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DASH_URL
ARG NEXT_PUBLIC_DEMO_IDENTIFIER
ARG NEXT_PUBLIC_DEMO_PASSWORD
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DASH_URL=${NEXT_PUBLIC_DASH_URL}
ENV NEXT_PUBLIC_DEMO_IDENTIFIER=${NEXT_PUBLIC_DEMO_IDENTIFIER}
ENV NEXT_PUBLIC_DEMO_PASSWORD=${NEXT_PUBLIC_DEMO_PASSWORD}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV SENTRY_RELEASE=${SENTRY_RELEASE}
ENV CI=true

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false \
    --mount=type=cache,id=turbo,target=/app/node_modules/.cache/turbo \
    --mount=type=cache,id=next-web,target=/app/apps/frontend/web/.next/cache \
    export SENTRY_AUTH_TOKEN="$( [ -f /run/secrets/SENTRY_AUTH_TOKEN ] && cat /run/secrets/SENTRY_AUTH_TOKEN || true )" && \
    pnpm turbo run build --filter=@crwsync/web...
```

(`ENV CI=true` makes `withSentryConfig`'s `silent: !process.env.CI` print upload logs during the Docker build, matching the pattern already set on the backend Dockerfile's base stage.)

- [ ] **Step 5: Mirror the same change in the dash Dockerfile**

Apply the identical `ARG`/`ENV`/secret-mount edit to `apps/frontend/dash/Dockerfile`, adjusting only the `--filter=@crwsync/dash...` and cache id (`next-dash`) to match its existing values.

- [ ] **Step 6: Verify Dockerfiles still build without the secrets present**

Run: `docker build -f apps/frontend/web/Dockerfile -t crwsync-web-test .`
Expected: build succeeds locally (the `required=false` secret mount means an absent secret resolves to an empty string, not a build failure).

Run the same for `apps/frontend/dash/Dockerfile`.

- [ ] **Step 7: Commit**

```bash
git add package.json .github/workflows/deploy.yml apps/frontend/web/Dockerfile apps/frontend/dash/Dockerfile
git commit -m "ci: wire Sentry source-map upload into build pipeline"
```

---

### Task 10: `stack.yml` runtime env wiring

**Files:**
- Modify: `stack.yml`
- Modify: `.github/workflows/deploy.yml` (`deploy` job env block)

**Interfaces:**
- Consumes the same secret names introduced in Task 9.

- [ ] **Step 1: Add backend Sentry env vars to `stack.yml`**

In `stack.yml`, add to the `backend` service's `environment:` list (after `STORAGE_REGION`):

```yaml
      - SENTRY_DSN=${SENTRY_DSN}
      - SENTRY_ENVIRONMENT=production
      - SENTRY_RELEASE=${SENTRY_RELEASE}
```

- [ ] **Step 2: Add frontend Sentry env vars to `stack.yml`**

Add to the `web` service's `environment:` list:

```yaml
      - NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN_WEB}
```

Add to the `dash` service's `environment:` list:

```yaml
      - NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN_DASH}
```

- [ ] **Step 3: Set the matching shell env vars in the `deploy` job**

In `.github/workflows/deploy.yml`, add to the `deploy` job's `env:` block (which is what `docker stack deploy -c stack.yml` interpolates `${...}` against):

```yaml
      SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
      SENTRY_RELEASE: ${{ github.sha }}
      NEXT_PUBLIC_SENTRY_DSN_WEB: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN_WEB }}
      NEXT_PUBLIC_SENTRY_DSN_DASH: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN_DASH }}
```

- [ ] **Step 4: Validate the compose file syntax**

Run: `docker compose -f stack.yml config --quiet`
Expected: no errors (this only validates YAML/interpolation shape; it will show the `${...}` vars as unset locally since they're only populated inside the `deploy` job — that's expected).

- [ ] **Step 5: Commit**

```bash
git add stack.yml .github/workflows/deploy.yml
git commit -m "ci: pass Sentry runtime env vars through to the deployed stack"
```

---

### Task 11: Roadmap update and manual verification handoff

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Check off the roadmap item**

In `ROADMAP.md`, change:

```markdown
* [ ] **Observability & Error Tracking**:
  * Integrate an error-tracking service (e.g., Sentry) across `apps/backend`, `apps/frontend/web`, and `apps/frontend/dash`.
  * Add structured log aggregation and basic alerting for production incidents.
```

to:

```markdown
* [x] **Observability & Error Tracking**:
  * Integrate an error-tracking service (e.g., Sentry) across `apps/backend`, `apps/frontend/web`, and `apps/frontend/dash`.
  * Add structured log aggregation and basic alerting for production incidents.
```

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark Observability & Error Tracking complete in roadmap"
```

- [ ] **Step 3: Hand off manual verification**

This step produces no commit — it's the checklist for the user to run by hand, since UI/E2E verification here is manual by request. Report the following steps back to the user as the way to confirm everything actually works end to end:

1. **Create three Sentry projects** (one org) at sentry.io: `crwsync-backend` (Node/NestJS platform), `crwsync-web` (Next.js), `crwsync-dash` (Next.js). Copy each project's DSN.
2. **Local `.env` / `.env` per app**: set `SENTRY_DSN` in `apps/backend/.env` and `NEXT_PUBLIC_SENTRY_DSN` in each frontend app's `.env.local` to their respective DSNs.
3. **Backend 500 test**: temporarily add `throw new Error("sentry smoke test");` to `AppController`'s root handler in `apps/backend/src/app.controller.ts`, restart the backend, hit `GET /`, confirm:
   - The response is a 500 with the standard `{ statusCode, path, timestamp, error }` shape.
   - The error appears in the `crwsync-backend` Sentry project within a minute.
   - Remove the temporary throw afterward.
4. **Backend 4xx non-report test**: attempt a login with a wrong password, confirm the 401 does **not** create a new Sentry event.
5. **Frontend crash test (web + dash)**: temporarily throw inside a page component in each app (as described in Task 6/8's verification steps), confirm the branded "Something went wrong" page renders instead of Next's default overlay, "Try again" recovers the page, and the event lands in the matching Sentry project.
6. **`global-error.tsx` test**: temporarily throw inside `apps/frontend/web/app/layout.tsx`'s render body, confirm the fully self-contained fallback page renders (still on-brand, still reports to Sentry). Repeat for dash. Remove the temporary throws.
7. **Structured logs check**: with the dev stack running (`docker compose -f docker-compose.dev.yml up`, plus the backend running against it), run `docker logs <backend-container>` or watch the `start:dev` console output — confirm each line is now a single-line JSON object (`{"level":30,"time":...,"msg":"..."}`) rather than the old colored Nest format.
8. **CI dry run**: push a commit to a branch/PR without the Sentry secrets configured yet, confirm the pipeline still passes (source-map steps should log as skipped, not failed). Then add the GitHub repo secrets listed in Task 9's Interfaces section and push to `main`, confirming the deploy succeeds and the source-map upload steps report success in the Actions log.
9. **Sentry alert rules**: in each of the three Sentry projects' dashboard, add an alert rule for "a new issue is first seen" (notify by email) and one for event-frequency spikes, per the design spec's §7.

No further code changes are expected from this checklist unless a step surfaces a real bug — if one does, treat it as a new bug to fix, not a re-run of this plan.

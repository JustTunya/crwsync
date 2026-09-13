# Observability & Error Tracking — Design Spec

**Milestone**: 5 — Operational Hardening & Long-Term Maintainability
**Date**: 2026-09-13
**Status**: Approved for implementation planning

## 1. Goal

Move crwsync from "errors are silent until reported" to "incidents are visible and actionable" across all three apps (`apps/backend`, `apps/frontend/web`, `apps/frontend/dash`), per Roadmap §4.F / Milestone 5:

> Integrate an error-tracking service across all three apps. Add structured log aggregation and basic alerting for production incidents.

## 2. Decisions (confirmed with user)

| Decision | Choice | Why |
|---|---|---|
| Error tracking backend | **Sentry Cloud (SaaS)** | Official SDKs for NestJS + Next.js, generous free tier, zero new infra to operate, built-in alert rules satisfy "alerting" without a separate stack. Rejected: self-hosted GlitchTip/Sentry — both add multi-container infra (Postgres+Celery+Redis, or Kafka+ClickHouse+Postgres+Redis) to run and maintain for a solo/small-team project. |
| Structured log aggregation | **`nestjs-pino`, JSON to stdout** | Captured by the existing docker `json-file` logging driver today; portable to any future aggregator (Loki/CloudWatch/Datadog) with zero further code changes, because it replaces Nest's `Logger` implementation, not its call sites. Rejected: standing up Grafana Loki + Promtail now — real infra to own/back up for a requirement that only asks for *structured* logs, not a queryable log UI. |
| Source maps | **Yes, wired into CI** | Readable production stack traces (real file/line/function) are worth the one-time CI setup; Sentry's Next.js plugin automates this at build time, and the backend gets an explicit `sentry-cli` upload step. |
| Frontend error UI | **Branded `error.tsx` + `global-error.tsx` for both apps** | Replaces Next.js's stock crash screen with an on-brand page, built from existing primitives (`GlassBox`, `Button`, DESIGN.md tokens) — matches the "beautiful, intuitive, brand-consistent" bar the user set. |

## 3. Architecture

```
                 ┌─────────────────────────────┐
                 │         Sentry Cloud         │
                 │  (errors, releases, alerts)  │
                 └──────────────┬───────────────┘
                                │ captureException / source maps
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
 apps/backend            apps/frontend/web       apps/frontend/dash
 @sentry/nestjs          @sentry/nextjs          @sentry/nextjs
 (instrument.ts,          (client/server/edge      (client/server/edge
  AllExceptionsFilter)     config, error.tsx)       config, error.tsx)
        │
 nestjs-pino → structured JSON → stdout → docker json-file driver
 (unchanged Logger call sites across the codebase)
```

Real-time/WebSocket paths, BullMQ workers, and REST controllers are unaffected — Sentry capture is wired at the single existing exception-filter chokepoint on the backend, and at the Next.js error-boundary chokepoints on the frontends. No per-route or per-service instrumentation.

## 4. Backend (`apps/backend`)

### 4.1 Sentry init
- New `src/instrument.ts`:
  ```ts
  import * as Sentry from "@sentry/nestjs";
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    release: process.env.SENTRY_RELEASE,
  });
  ```
- `main.ts`'s first line becomes `import "src/instrument";` (must precede every other import per Sentry's Node SDK requirement — instruments modules before they're `require`d).
- No entry added to `main.ts`'s `requiredEnvVars` fail-fast list — `SENTRY_DSN` unset means the SDK is inert, which is correct behavior for local dev.

### 4.2 Exception capture
- `AllExceptionsFilter.catch()` gets one addition: before building the response, if `status >= 500` (i.e., not a recognized `HttpException` or a 5xx `HttpException`), call `Sentry.captureException(exception)`. 4xx `HttpException`s (validation, auth, not-found) are not sent — they're expected control flow, not incidents.
- No new filter, no change to filter registration order in `main.ts`.

### 4.3 Structured logging
- Add `nestjs-pino` + `pino-http`. In `AppModule`: `LoggerModule.forRoot({ pinoHttp: { level: process.env.LOG_LEVEL || "info", redact: ["req.headers.cookie", "req.headers.authorization"] } })`.
- `main.ts`: `app.useLogger(app.get(Logger))` right after `NestFactory.create`, with `bufferLogs: true` (already set) so nothing logged during bootstrap is dropped.
- `src/common/interceptors/logging.interceptor.ts` is **deleted** and removed from `main.ts`'s `useGlobalInterceptors` — pino-http already logs one structured line per request/response (method, url, status, duration), making the old interceptor's `tap()` log redundant.
- Every existing `new Logger(SomeName.name)` across guards/services/gateways is untouched — `nestjs-pino`'s `Logger` is API-compatible with Nest's built-in one.
- Sensitive header redaction (`cookie`, `authorization`) is added at the pino config level since JSON logs are more copy-pasteable than the old console format — worth the one explicit safeguard.

### 4.4 New env vars (all optional, backend `.env.example`)
```
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=
LOG_LEVEL=info
```

## 5. Frontend (`apps/frontend/web`, `apps/frontend/dash`)

Identical setup in both apps (independently deployable, so each gets its own Sentry project — two DSNs, not a shared one — consistent with "separation of deployable services is real" from CLAUDE.md).

### 5.1 SDK wiring
- Add `@sentry/nextjs`.
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` at each app root: `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 })`.
- `instrumentation.ts` per Next.js App Router convention, registering the server/edge configs.
- `next.config.ts` wrapped in `withSentryConfig(nextConfig, { org, project, authToken: process.env.SENTRY_AUTH_TOKEN, silent: true })` — this is what triggers automatic source-map upload on `next build` when `SENTRY_AUTH_TOKEN` is present; a no-op wrapper (maps upload skipped) when it's absent, so local `next build` still works without secrets.

### 5.2 Branded error boundaries
Two files per app: `app/error.tsx` (segment-level, rendered inside the root layout — chrome/nav still visible) and `app/global-error.tsx` (root-layout-level fallback — must render its own `<html><body>`, can't assume providers mounted).

Design, built from existing DESIGN.md tokens and components (no new visual language):
- Container: `GlassBox` (`components/ui/glassbox.tsx`), centered, `rounded-2xl`.
- Icon: `lucide-react` `AlertTriangle` or `Flame`, ember-orange tint (`text-primary`), inside a soft `bg-primary/10` circular badge — the system's existing "one ember rule" applied to an incident icon instead of a CTA.
- Copy: headline weight ("Something went wrong"), muted-foreground body line ("An unexpected error occurred. Our team's been notified.").
- Error reference: a `pill-badge`-styled chip showing a short digest (Next's `error.digest` for the segment boundary; a locally generated short id for `global-error.tsx`, since digest isn't guaranteed there) — support-quotable, not a raw stack trace.
- Actions: primary `Button` "Try again" → calls the `reset()` prop Next.js passes to `error.tsx` (re-renders the segment without a full reload); outline `Button` "Go home" → `Link` to `/` (web) or the active workspace root (dash, read from `localStorage` `crw-ws` the same way `SidebarWorkspace` does, falling back to `/`).
- Reporting: `useEffect(() => { Sentry.captureException(error); }, [error])` on mount in both files.
- `global-error.tsx` inlines the same visual language via Tailwind classes directly (importing `@crwsync/styles` still works since it's a CSS import, not a React provider) rather than depending on `ThemeProvider`/`QueryProvider`, since those may not have mounted if the crash originated in the root layout itself.

### 5.3 New env vars (both apps, `.env.example` — created if missing)
```
NEXT_PUBLIC_SENTRY_DSN=
```
CI-only (not runtime, not in app `.env.example`): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## 6. CI/CD (`.github/workflows/*.yml`)

- Add repo secrets `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` (org-level, shared across the three Sentry projects).
- `web`/`dash` Docker build steps: pass `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (per-app), and `SENTRY_RELEASE=${{ github.sha }}` as build args/env — `withSentryConfig` picks these up automatically during `next build` inside the Dockerfile; absent secrets mean the plugin silently skips upload (dev/fork-safe).
- Backend build step: after `nest build`, run `sentry-cli sourcemaps inject dist && sentry-cli sourcemaps upload --release=${{ github.sha }} dist`, gated behind `if: ${{ secrets.SENTRY_AUTH_TOKEN != '' }}` so it's skipped entirely when the secret isn't configured (e.g. forks).

## 7. Alerting

Configured in the Sentry dashboard (not code), one-time manual setup documented for the user:
- Alert rule: notify (email) when a new issue is first seen.
- Alert rule: notify when an issue's event frequency exceeds a threshold within a rolling window (e.g. 10 events / 5 min).

This satisfies "basic alerting for production incidents" without a separate alerting stack (Prometheus Alertmanager, etc.), which is out of scope for this task.

## 8. `stack.yml` changes

Add to the `backend`, `web`, and `dash` service `environment:` blocks: `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (per service) and `SENTRY_RELEASE`, sourced from the same `${VAR}` passthrough pattern already used for every other secret in the file.

## 9. Testing

- **Automated** (written by me): one backend unit test on `AllExceptionsFilter` asserting `Sentry.captureException` is called for a simulated 500 and *not* called for a simulated 400 (Sentry SDK mocked via `jest.mock`).
- **Manual** (performed by the user — I will not write Playwright/browser tests for this): a step-by-step verification checklist handed over after implementation, covering:
  1. Trigger a real backend 500 → confirm it appears in the backend's Sentry project with a readable (non-minified) stack trace.
  2. Confirm a backend 4xx (e.g. a bad login attempt) does **not** create a Sentry event.
  3. Force a client-side render error in `web` and `dash` → confirm the branded error page renders (not Next's default), "Try again" recovers, and the event lands in the respective Sentry project with source-mapped frames.
  4. Kill the root layout deliberately (temporary throw) to exercise `global-error.tsx` in one app.
  5. `docker logs` (or `docker compose logs backend`) on the dev stack → confirm log lines are structured JSON, not the old colored console format.
  6. Confirm `SENTRY_DSN` unset locally still boots the backend and renders the frontends with zero errors (graceful no-op).

## 10. Out of scope

- Self-hosted log aggregation UI (Loki/Grafana) — deferred; JSON-to-stdout is the enabling step for it later.
- Custom alerting/metrics stack — Sentry's built-in rules are sufficient for "basic alerting."
- Performance/APM tracing depth (profiling, custom spans) beyond the default `tracesSampleRate` — not requested.
- Backend test coverage targets — separate Milestone 5 line item.

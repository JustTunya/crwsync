<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="apps/frontend/web/public/logo@white.svg">
  <source media="(prefers-color-scheme: light)" srcset="apps/frontend/web/public/logo@orange.svg">
  <img src="apps/frontend/web/public/logo@orange.svg" alt="CRWSync" width="280">
</picture>

### Real-Time Collaborative Workspace Platform

An enterprise-grade collaborative workspace, engineered end to end — public
portal, authenticated dashboard, and a horizontally scalable real-time
backend keeping tasks, files, and distributed teams in perfect sync.
Portfolio project.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white&labelColor=1A1816)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat&logo=react&logoColor=white&labelColor=1A1816)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white&labelColor=1A1816)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat&logo=tailwindcss&logoColor=white&labelColor=1A1816)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animation-C85A2A?style=flat&logo=framer&logoColor=white&labelColor=1A1816)](https://www.framer.com/motion/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat&logo=nestjs&logoColor=white&labelColor=1A1816)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-3982CE?style=flat&logo=prisma&logoColor=white&labelColor=1A1816)](https://www.prisma.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=flat&logo=socketdotio&logoColor=white&labelColor=1A1816)](https://socket.io)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queues-DC2626?style=flat&labelColor=1A1816)](https://docs.bullmq.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white&labelColor=1A1816)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white&labelColor=1A1816)](https://redis.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat&logo=turborepo&logoColor=white&labelColor=1A1816)](https://turbo.build)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=flat&logo=pnpm&logoColor=white&labelColor=1A1816)](https://pnpm.io)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-B93826?style=flat&labelColor=1A1816)](LICENSE)

</div>

---

## About

crwsync is a fictional crew-collaboration platform built as a complete,
production-shaped application — not a static mockup. It demonstrates a real
enterprise workflow with the rigor of a production system: a team signs in,
organizes work into projects, moves tasks around a shared board, and watches
teammates' changes land instantly, while a decoupled backend enforces auth,
queues background work, and fans out real-time state over WebSockets at
scale.

The architecture reflects deliberate separation of concerns rather than a
single monolith: three independently deployable services — a public
marketing portal, an authenticated dashboard, and a NestJS API — share one
root domain via subdomains in production, isolating public traffic from
authenticated workloads, and run together locally through a unified
Turborepo pipeline.

**This is a demo project.** No real customers, no production traffic. It
exists to showcase a complete, enterprise-grade collaborative-workspace flow
end to end: sign up → create a project → invite a crew → sync tasks and
files in real time, with the same auth, queueing, and real-time
infrastructure a production SaaS product would run.

## Features

### Public portal

- **Marketing site** — a dedicated public-facing landing experience,
  deployed and routed independently from the authenticated app so public
  traffic never competes with or shares a runtime with logged-in workloads.
- **Cross-subdomain auth handoff** — sign-in state carries seamlessly from
  the portal to the dashboard subdomain via shared, scoped HTTP-only
  cookies, with zero friction for the end user.
- **Contact intake pipeline** — the public contact form persists to Postgres
  and dispatches transactional email through a queued job, not an inline
  request-blocking send.

### Dashboard (`dash.crwsync.xyz`)

- **Command-center home** — a live Bento-grid overview (focus tasks, pinned
  modules, active projects, crew presence, activity stream, velocity) built
  from real-time socket state, not a static summary screen.
- **Kanban board** — `@dnd-kit`-powered drag-and-drop task board with
  optimistic reordering that reconciles against the API and patches other
  clients' caches over the socket the moment a card moves.
- **Real-time chat** — room and direct-message channels with live typing
  indicators, read receipts, emoji reactions, edit/delete, attachments, and
  per-room rate limiting, all delivered over a single shared Socket.IO
  gateway.
- **File rooms** — per-workspace file rooms with presigned direct-to-bucket
  uploads, so payloads never transit the API process.
- **Workspace-wide search** — a single query fans out across tasks, chat
  messages, files, and members in one cached round trip.
- **Schedules & statistics** — a calendar view for deadlines/events and a
  workspace analytics dashboard (velocity, completion, activity) computed
  server-side and cached, not recomputed on every render.
- **Live notifications** — task/mention/invite events are persisted and
  pushed instantly to the recipient's private socket room, with read/
  read-all state synced across every open tab.
- **Granular settings** — profile, appearance, notifications, privacy, and
  security live as dedicated settings surfaces; workspace-level settings
  cover members/roles, invites, modules, and a guarded danger zone.
- **Member invites & roles** — email invites with pending-invite tracking
  and role assignment, enforced end to end by the same guard/decorator
  stack the API uses for every other authorization check.
- **Localization-ready UI** — dashboard strings are routed through a shared
  `@crwsync/i18n` package (English/Spanish shipped) instead of being
  hardcoded per component.
- **Optimistic UI** — TanStack Query and Zustand make every interaction
  feel instant, updating the interface ahead of the network round trip
  while writes settle against the API in the background.
- **Design-system UI** — Tailwind CSS, Radix UI primitives, and Framer
  Motion deliver an accessible, consistent, and animated interface
  throughout, with light/dark themes built in.

### Platform / infrastructure

- **Backend API (`@crwsync/backend`)** — a strict, modular NestJS service
  on Node, exposing REST endpoints and a Socket.IO gateway behind one
  well-structured process, organized into focused modules (auth, workspace,
  board, chat, files, search, statistics, notification, storage, contact).
- **Real-time sync at scale** — task, chat, file, and presence state pushed
  live over Socket.IO, backed by a Redis adapter so WebSocket delivery
  scales horizontally across multiple instances rather than being pinned to
  one.
- **Resilient, distributed queues** — BullMQ handles asynchronous
  background jobs (chat fan-out, email delivery, session cleanup) reliably
  and without ever blocking request paths.
- **Defense-in-depth auth** — short-lived JWTs paired with HTTP-only,
  secure cookies, bcrypt-hashed passwords, and a scheduled purge of expired
  sessions, minimizing the attack surface for session hijacking.
- **Postgres via Prisma** — schema and migrations own the actual business
  logic as a single source of truth, not scattered across the application
  layer.
- **Cache-first reads, targeted invalidation** — a Redis-backed cache
  service with a centralized key factory sits in front of hot read paths
  (auth/session/membership checks); mutations invalidate only the specific
  keys they affect, never a blanket flush.
- **Object storage, S3-compatible** — avatars and file-room uploads go
  straight to a bucket (MinIO locally, Cloudflare R2 in production) via
  presigned URLs.
- **Error monitoring** — Sentry is wired into both the backend and the
  dashboard for real-time exception tracking and release visibility.
- **Automated CI/CD** — GitHub Actions run a security audit on every change
  and drive deployment, with Dependabot keeping dependencies current.
- **Docker-first, production-ready ops** — per-service Dockerfiles, a dev
  Compose stack for local Postgres/Redis/MinIO, and a hardened production
  `stack.yml` for Docker Swarm with rolling updates and per-service
  resource limits built in from day one.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev) |
| Backend | [NestJS 11](https://nestjs.com) on Node.js |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Styling / motion | [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [Framer Motion](https://www.framer.com/motion/) |
| State / Data | [Zustand](https://zustand-demo.pmnd.rs), [TanStack Query](https://tanstack.com/query) |
| Data / ORM | [PostgreSQL 16](https://www.postgresql.org), [Prisma 7](https://www.prisma.io) |
| Realtime | [Socket.IO](https://socket.io) + Redis adapter |
| Queues | [BullMQ](https://docs.bullmq.io) |
| Auth | Passport.js (JWT/Local), bcrypt, HTTP-only cookies |
| Object storage | S3-compatible (MinIO dev / Cloudflare R2 prod), presigned uploads |
| Rich editing / DnD | [Tiptap](https://tiptap.dev), [dnd-kit](https://dndkit.com) |
| Observability | [Sentry](https://sentry.io) (backend + dashboard) |
| i18n | `@crwsync/i18n` (English, Spanish) |
| Testing | [Vitest](https://vitest.dev) (frontend), [Jest](https://jestjs.io) (backend) |
| Monorepo | [Turborepo](https://turbo.build), [pnpm](https://pnpm.io) |
| CI/CD | GitHub Actions, Dependabot |
| Deployment | Docker, Docker Swarm (`stack.yml`) |

## Running locally

```bash
pnpm install
docker-compose -f docker-compose.dev.yml up -d   # local Postgres + Redis
pnpm --filter @crwsync/backend run prisma:generate
pnpm --filter @crwsync/backend run prisma:migrate:dev
pnpm run dev
```

- Web Portal: `http://localhost:3000`
- Dashboard: `http://localhost:3001`
- API Gateway: `http://localhost:8080`

Create a `.env` in each of `apps/frontend/web`, `apps/frontend/dash`, and
`apps/backend` and fill in:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_DASH_URL` | local dev URLs of the three services |
| `DATABASE_URL` | `docker-compose.dev.yml` credentials against local Postgres |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_KEY_PREFIX` | `docker-compose.dev.yml` local Redis |
| `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`, `COOKIE_SECRET` | any string — sign local sessions and cookies |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` | an SMTP provider (e.g. Zoho Mail), for transactional email |
| `CORS_ORIGIN`, `APP_URL`, `ACCESS_COOKIE_DOMAIN`, `REFRESH_COOKIE_DOMAIN` | `localhost` for local dev |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION` | `docker-compose.dev.yml` MinIO credentials locally; an S3-compatible bucket (e.g. Cloudflare R2) in production |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | optional — leave blank to run without error monitoring locally |

## Layout of the codebase

- `apps/frontend/web` — the public marketing portal
- `apps/frontend/dash` — the authenticated dashboard: home, board, chat,
  files, schedules, statistics, search, and settings (Next.js App Router)
- `apps/backend` — NestJS API, Socket.IO gateway, BullMQ workers, modularized
  by domain (`auth`, `workspace`, `board`, `chat`, `files`, `search`,
  `statistics`, `notification`, `storage`, `contact`, …)
- `packages/types` — shared domain types and operation-result shapes used by
  both frontends and the backend
- `packages/styles` — shared Tailwind design tokens/config
- `packages/templates` — transactional email templates
- `packages/i18n` — shared localization strings/hooks (English, Spanish)
- `stack.yml` — production Docker Swarm deployment definition

## What's simulated

- No real customers or production workspaces — seed/demo data only.
- Email delivery requires your own SMTP credentials; none are provisioned.
- Every other layer — auth, queues, real-time sync, data integrity — runs
  exactly as it would in production.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

The source is public so it can be read, studied, and used for personal or
educational purposes. **Commercial use — including running this as, or as
part of, an actual business — is not permitted without a separate license
from the author.** Reach out if you'd like to discuss one.

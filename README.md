<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="apps/frontend/web/public/logo@white.svg">
  <source media="(prefers-color-scheme: light)" srcset="apps/frontend/web/public/logo@orange.svg">
  <img src="apps/frontend/web/public/logo@orange.svg" alt="CRWSync" width="280">
</picture>

### Real-Time Collaborative Workspace Platform

A full crew-sync workspace, built end to end — public portal, authenticated
dashboard, and a real-time backend keeping tasks, files, and teams in sync.
Portfolio project.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white&labelColor=1A1816)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat&logo=react&logoColor=white&labelColor=1A1816)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white&labelColor=1A1816)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat&logo=nestjs&logoColor=white&labelColor=1A1816)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-3982CE?style=flat&logo=prisma&logoColor=white&labelColor=1A1816)](https://www.prisma.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=flat&logo=socketdotio&logoColor=white&labelColor=1A1816)](https://socket.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white&labelColor=1A1816)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white&labelColor=1A1816)](https://redis.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat&logo=turborepo&logoColor=white&labelColor=1A1816)](https://turbo.build)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=flat&logo=pnpm&logoColor=white&labelColor=1A1816)](https://pnpm.io)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-B93826?style=flat&labelColor=1A1816)](LICENSE)

</div>

---

## About

CRWSync is a fictional crew-collaboration platform built as a complete,
production-shaped application — not a static mockup. It demonstrates a real
enterprise workflow: a team signs in, organizes work into projects, moves
tasks around a shared board, and sees teammates' changes land instantly,
while a decoupled backend enforces auth, queues background work, and fans
out real-time state over WebSockets.

The system is split into three services — a public marketing portal, an
authenticated dashboard, and a NestJS API — sharing one root domain via
subdomains in production, and run together locally through a Turborepo
pipeline.

**This is a demo project.** No real customers, no production traffic. It
exists to show a complete collaborative-workspace flow end to end: sign up →
create a project → invite a crew → sync tasks and files in real time.

## Features

### Public portal

- **Marketing site** — the public-facing landing experience, deployed and
  routed independently from the authenticated app so public traffic never
  shares a runtime with logged-in workloads.
- **Cross-subdomain auth handoff** — sign-in state carries from the portal
  to the dashboard subdomain via shared, scoped HTTP-only cookies.

### Dashboard (`dash.crwsync.xyz`)

- **Real-time sync** — task, file, and workspace state pushed live over
  Socket.IO, backed by a Redis adapter for horizontal WebSocket scaling
  across instances.
- **Modular workspaces** — projects, shared modules, and drag-and-drop
  organization for moving work between them.
- **Optimistic UI** — TanStack Query and Zustand keep interactions instant
  while writes settle against the API in the background.
- **Design-system UI** — Tailwind CSS and Radix UI primitives for an
  accessible, consistent interface.

### Platform / infrastructure

- **Backend API (`@crwsync/backend`)** — NestJS on Node, exposing REST
  endpoints and a Socket.IO gateway behind one process.
- **Resilient queues** — BullMQ handles distributed, asynchronous
  background jobs (email delivery, session cleanup) without blocking
  request paths.
- **Session-based auth** — short-lived JWTs paired with HTTP-only, secure
  cookies, bcrypt-hashed passwords, and a scheduled purge of expired
  sessions.
- **Postgres via Prisma** — schema and migrations own the actual business
  logic, not the application layer.
- **Docker-first ops** — a dev Compose stack for local Postgres/Redis, and
  a production `stack.yml` for Docker Swarm with rolling updates and
  per-service resource limits.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev) |
| Backend | [NestJS 11](https://nestjs.com) on Node.js |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com) primitives |
| State / Data | [Zustand](https://zustand-demo.pmnd.rs), [TanStack Query](https://tanstack.com/query) |
| Data / ORM | [PostgreSQL 16](https://www.postgresql.org), [Prisma 7](https://www.prisma.io) |
| Realtime | [Socket.IO](https://socket.io) + Redis adapter |
| Queues | [BullMQ](https://docs.bullmq.io) |
| Auth | Passport.js (JWT/Local), bcrypt, HTTP-only cookies |
| Monorepo | [Turborepo](https://turbo.build), [pnpm](https://pnpm.io) |
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

## Layout of the codebase

- `apps/frontend/web` — the public marketing portal
- `apps/frontend/dash` — the authenticated dashboard (Next.js App Router)
- `apps/backend` — NestJS API, Socket.IO gateway, BullMQ workers
- `packages/*` — shared modules used across the monorepo
- `stack.yml` — production Docker Swarm deployment definition

## What's simulated

- No real customers or production workspaces — seed/demo data only.
- Email delivery requires your own SMTP credentials; none are provisioned.

## License

**Proprietary and Confidential.**

This repository and its source code are provided strictly for viewing and
portfolio evaluation purposes. All rights are reserved. No permission is
granted to use, copy, modify, distribute, or deploy this software, in whole
or in part, without explicit written permission from the author. See
[LICENSE](LICENSE).

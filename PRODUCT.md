# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, addressed by different surfaces:

- **Small teams and crews** (renovation crews, small studios, volunteer
  organisations) — evaluate crwsync from the public portal
  (`apps/frontend/web`) and use the authenticated dashboard
  (`apps/frontend/dash`): sign in, organize work into projects, move tasks on
  a shared board, invite teammates, watch changes sync in real time.
- **Technical evaluators** (engineers, reviewers) — read the "How it's built"
  part of the portal to judge the architecture.

## Product Purpose

crwsync is a shared workspace for small teams: boards, chat, files, and
schedules in one place, updated live in every open tab, with optional
Claude-powered summaries and digests. It is in early access, built by one
person. Success is a workspace that behaves like a reliable collaboration
product and a landing page that says plainly what it is.

## Positioning

Emphasis is **production-grade architecture** over UI polish (though the UI is
still designed with care). What a neighboring project could not
truthfully copy: three independently deployable services (public portal,
authenticated dashboard, NestJS API) sharing one root domain via subdomains,
real-time state fan-out over Socket.IO with a Redis adapter for horizontal
scaling, BullMQ-backed background jobs, defense-in-depth auth (short-lived
JWTs + HTTP-only cookies + bcrypt + scheduled session purge), and Postgres/
Prisma as the single source of truth for business logic — run together via a
unified Turborepo pipeline, deployable to Docker Swarm with per-service
resource limits.

## Operating Context

- Local dev: `pnpm run dev` after `docker-compose.dev.yml` brings up local
  Postgres + Redis; Web Portal on `:3000`, Dashboard on `:3001`, API Gateway
  on `:8080`.
- Production: three services on subdomains of one root domain (dashboard at
  `dash.crwsync.xyz`), deployed via Docker Swarm (`stack.yml`) with rolling
  updates.
- Cross-subdomain auth handoff: sign-in state carries from the public portal
  to the dashboard subdomain via shared, scoped HTTP-only cookies.

## Capabilities and Constraints

- Real-time sync: task/file/workspace state pushed live over Socket.IO,
  Redis adapter scales delivery horizontally across instances.
- Modular, reorganizable workspaces with drag-and-drop.
- Optimistic UI via TanStack Query + Zustand.
- Design-system UI: Tailwind CSS + Radix UI primitives.
- Backend: NestJS (`@crwsync/backend`), REST + Socket.IO gateway, BullMQ for
  async jobs (email delivery, session cleanup).
- Auth: short-lived JWTs, HTTP-only secure cookies, bcrypt-hashed passwords,
  scheduled purge of expired sessions.
- Data: PostgreSQL via Prisma, schema/migrations as source of truth.
- **Early access**: the shared demo account holds seeded sample data. Email
  delivery requires the operator's own SMTP credentials — none are
  provisioned. Auth, queues, real-time sync, and data integrity run the same
  way in the demo as in any workspace.
- Optional AI features (summary, digest, task drafts, stand-up) call the
  Anthropic API server-side; see the README for configuration.
- Licensed under FSL-1.1-ALv2 (Functional Source License, Apache 2.0 future
  license) — source is public to read and use except for competing offerings;
  each release converts to Apache 2.0 after two years.

## Brand Commitments

- Name: **crwsync** (styled lowercase). Logo assets exist at
  `apps/frontend/web/public/logo@orange.svg` (light) and `logo@white.svg`
  (dark), with light/dark variants already wired via `<picture>`.
- Author: Tunya Lénárd-Sándor.

## Evidence on Hand

- README.md is the authoritative feature/stack description — treat it as a
  strong source for claims, not as something to re-derive from scratch.
- No testimonials, case studies, press, customer counts, or pricing exist and
  none should be fabricated. Use placeholders and flag them.

## Product Principles

1. Every claim must be truthfully demonstrable in the running app — no
   claims the code doesn't back up (this is judged as real
   engineering work).
2. Public marketing surfaces and authenticated product surfaces are built
   and evaluated as genuinely separate services, not one app with a login
   wall.
3. Architecture rigor (separation of services, real-time scale, queueing,
   auth depth, data integrity) is the primary differentiator; visual design
   should support and reveal that rigor rather than distract from it.
4. Simulated pieces (email, demo data) are clearly scoped as simulated;
   everything else must behave production-correctly.

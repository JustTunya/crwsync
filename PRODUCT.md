# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two distinct audiences, addressed by different surfaces:

- **Portfolio evaluators** (recruiters, hiring managers, technical reviewers,
  potential clients) — visit the public marketing portal (`apps/frontend/web`)
  to judge engineering and product-design skill. Their job: quickly assess
  whether this person can build a real, production-shaped system, not just a
  static mockup.
- **Crew/team members** (the in-product fictional persona) — use the
  authenticated dashboard (`apps/frontend/dash`) as if crwsync were a real
  SaaS product: sign in, organize work into projects, move tasks on a shared
  board, invite teammates, watch changes sync in real time.

## Product Purpose

crwsync is a fictional crew-collaboration platform built as a complete,
production-shaped application — not a static mockup — to demonstrate a full
enterprise workflow end to end: sign up → create a project → invite a crew →
sync tasks and files in real time. Success for the portfolio evaluator is
recognizing production-grade engineering rigor; success for the in-app persona
is a workspace that behaves like a real, reliable collaboration product.

## Positioning

Emphasis is **production-grade architecture** over UI polish (though the UI is
still designed with care). What a neighboring portfolio project could not
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
- **This is a demo project**: no real customers or production traffic; seed/
  demo data only. Email delivery requires the operator's own SMTP
  credentials — none are provisioned. Every other layer (auth, queues,
  real-time sync, data integrity) runs as it would in production.
- Licensed under PolyForm Noncommercial 1.0.0 — source is public for reading/
  study/personal/educational use; commercial use requires a separate license
  from the author.

## Brand Commitments

- Name: **crwsync** (styled lowercase). Logo assets exist at
  `apps/frontend/web/public/logo@orange.svg` (light) and `logo@white.svg`
  (dark), with light/dark variants already wired via `<picture>`.
- Author: Tunya Lénárd-Sándor.

## Evidence on Hand

- README.md is the authoritative feature/stack description and already
  reads as polished, professional portfolio copy — treat it as a strong
  source for claims, not as something to re-derive from scratch.
- No testimonials, case studies, press, or real customer evidence exist or
  should be fabricated — this is explicitly a demo/portfolio project.

## Product Principles

1. Every claim must be truthfully demonstrable in the running app — no
   claims the code doesn't back up (this is being judged as real
   engineering work).
2. Public marketing surfaces and authenticated product surfaces are built
   and evaluated as genuinely separate services, not one app with a login
   wall.
3. Architecture rigor (separation of services, real-time scale, queueing,
   auth depth, data integrity) is the primary differentiator; visual design
   should support and reveal that rigor rather than distract from it.
4. Simulated pieces (email, demo data) are clearly scoped as simulated;
   everything else must behave production-correctly.

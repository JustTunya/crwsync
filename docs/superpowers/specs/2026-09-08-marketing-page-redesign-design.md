# Marketing Page Redesign — Design Spec

**Date:** 2026-09-08
**Scope:** `apps/frontend/web` public landing page (`app/page.tsx` and `components/home/*`)
**Audience for this redesign:** recruiters and freelance clients evaluating Tunya Lénárd-Sándor's engineering work, landing on crwsync's public marketing page.

## Problem

crwsync's landing page currently pitches itself as a real SaaS product ("Work in sync. Not in silos." / "Join the crew"), per `PRODUCT.md`'s deliberate positioning of architecture rigor over UI polish. That positioning is right for the Architecture section, but the page as a whole doesn't clearly or quickly answer the actual question a recruiter or freelance client has in the first 5 seconds: *what is this, who made it, and why should I keep looking.*

Concrete gaps found during audit (see "Current state" below):
- No product screenshots or UI preview anywhere on the page — the only visual proof of engineering is the backend/infra Architecture diagram, nothing shows the actual dashboard UI.
- No low-friction way to see the real product — signup is the only CTA, which most evaluators won't complete.
- No "who built this" section — no bio, no links to GitHub/LinkedIn/resume.
- No tech-stack quick-scan — stack is only visible deep inside the Architecture diagram.
- Voice inconsistency: the Contact section abruptly switches from product voice ("crwsync") to first-person author voice ("Get in touch with me") with no transition.
- Footer has a fuller nav/social link grid coded but commented out (dead code), with irrelevant socials (Discord/TikTok/Bluesky) for a solo dev portfolio.
- No `prefers-reduced-motion` fallback on the animated Architecture diagram, which is the page's heaviest motion element.

A previously-unknown asset changes the plan materially: `apps/demo/` contains a finished, professionally cut 86-second product walkthrough video with voiceover (`crwsync.webm`, plus a light-theme variant under `raw-light/`), covering landing → signup → workspace creation → invite flow → statistics → task board → live multiplayer chat → projects → home dashboard. It is fully rendered but not referenced anywhere in the web app. This directly solves the "no product screenshot" gap better than a static mockup would.

## Current state (audit findings)

**Routes:** `/` is the only marketing page (single-page, anchor-linked sections: `#features`, `#architecture`, `#contact`). Auth flows live under `/auth/*`. No `/pricing`, `/features`, `/about` routes exist.

**Current section order:** Header → Hero → Features (bento grid, 5 cards) → Architecture (two animated diagrams: Runtime Architecture, CI/CD Pipeline) → Contact (two-column: personal blurb + form) → Footer.

**Current hero copy:**
- H1: "Work in sync. **Not in silos.**"
- Sub: "Turn team chaos into shared momentum. crwsync brings your chat, tasks, and schedules into one real-time workspace so your crew never misses a beat."
- CTA: "Join the crew" → `/auth/signup`

**Design system constraints (from `DESIGN.md`, must be respected):**
- One accent color only (Ember Orange, `oklch(0.703 0.188 36.91)`) — "One Ember Rule"
- Warm-only neutral palette, no cold gray — "Warm-Only Rule"
- Glass-not-card: translucent gradient + hairline border + blur before solid card+shadow
- Figtree only, no second typeface — "One Voice Rule"
- Framer Motion blur-fade/stagger pattern for reveals, consistent with existing header/diagram
- Generous rounding, public site uses wide breathing sections (`py-24`/`py-12`, capped `max-w-4xl/6xl/7xl`)

**Demo login flow (confirmed from code):** `components/signin-form.tsx` calls the `signin` server action (`services/auth.service.tsx`), which does `api.post("/auth/signin", { identifier, password, rememberMe })` and returns `{ success, errors, message }`. On success, the form redirects to `NEXT_PUBLIC_DASH_URL`. This can be reused directly with a hardcoded demo payload — no new backend endpoint needed.

**Demo credentials (from `.env.demo`, gitignored — do not commit values):** three seeded personas exist: `DEMO_OWNER_*` (workspace owner, full access — use this one for the public "Try Live Demo" button), `DEMO_MEMBER_*`, `DEMO_INVITEE_*`. Seed script: `apps/backend/prisma/seed.demo.mjs`, idempotent, scoped to workspace slug `northstar`.

**Demo video asset (from `apps/demo/`):** `crwsync.webm` (1920×1080, ~86s, ~17MB), `raw-light/*.webm` (light-theme per-beat clips), `crwsync-voiceover.mp3`, `voiceover.words.json` (word-level transcript), `SHOTLIST.md` (full beat-by-beat breakdown). Ends on a logo card with "CrewSync — join the crew" voiceover, matching current hero CTA copy.

## Approach (approved)

**Evaluator-first restructure.** Reframe the page to lead directly with the portfolio claim rather than the in-fiction SaaS pitch, while keeping the Architecture section (the strongest existing asset) untouched. Add a one-click live demo login and embed the existing walkthrough video as click-to-play proof, rather than a fabricated hero screenshot.

## New page structure

```
Header                     (unchanged shell; CTA copy updated)
Hero                       (rewritten copy, two CTAs, video-thumbnail visual)
Proof strip                (new — tech-stack logo row)
Features ("Product tour")  (existing bento grid, copy lightly reframed)
Architecture                (unchanged)
About the Builder          (new — absorbs Contact's orphaned personal copy)
Contact                    (trimmed to form only)
Footer                     (dead code removed, real links only)
```

### Hero
- Headline leads with the portfolio claim, not the crew-SaaS pitch: **"Production-grade, built solo."** with accent **"See how."**
- Subheadline: one line naming what crwsync is (a fictional real-time collaboration SaaS, built end-to-end as a portfolio demo) and why it exists (prove full-stack + infra ability).
- Visual: a poster-frame thumbnail (extracted from the demo video, dashboard/board shot) inside a glass-framed mockup, with a centered play button overlay.
- CTA row, two buttons:
  1. **Try Live Demo** (primary/ember) — submits the existing `signin` action with the seeded `DEMO_OWNER` payload, redirects to the dashboard exactly like a normal signin.
  2. **Watch the walkthrough** (ghost/outline) — opens the demo video in a modal/lightbox (click-to-play, not autoplay; `preload="none"`).
- Clicking the hero poster thumbnail also opens the same video modal (thumbnail and "Watch the walkthrough" button are two entry points to one modal).

### Proof strip (new)
Thin, quiet band directly under the hero — no heading, no eyebrow pill, just a row of stack logos (Next.js, NestJS, PostgreSQL, Redis, Docker, Socket.IO, Prisma) pulled from the same set as the README badges. Gives a 3-second technical scan before committing to reading further.

### Features → "Product tour"
Same 5 bento cards (Kanban, Workspaces, Chat, Scheduling, Notifications), copy tightened to read as "what the walkthrough shows" rather than "what you get" — wording adjustment only, no structural change.

### Architecture
Unchanged — this is the strongest existing asset and directly serves the technical evaluator. One addition: respect `prefers-reduced-motion` — when set, render the diagrams in their settled end-state with no signal-beam animation or marching-ants, instead of forcing the motion sequence.

### About the Builder (new)
Short, scannable section: photo, 2–3 sentence bio, a one-line stack/strengths summary, and links (GitHub, LinkedIn, resume/CV, email). This absorbs the personal copy currently orphaned inside Contact ("I'm always open to new opportunities…"), giving it a proper heading and transition instead of an unannounced voice switch mid-section.

### Contact
Trimmed to the form only, plus a single short line. The personal intro now lives in About the Builder.

### Footer
Remove the commented-out dead block. Ship a slim, real version: GitHub, LinkedIn, email, © line. Drop placeholder socials (Bluesky/Discord/Facebook/Instagram/TikTok/X/YouTube) that don't apply to a solo portfolio.

## Demo CTA — implementation approach

No new backend endpoint. The "Try Live Demo" button uses the same `useActionState(signin, initState)` pattern as `SigninForm`, dispatching a payload built from `DEMO_OWNER_*` env values exposed to the client build (needs a `NEXT_PUBLIC_`-prefixed pair, or a thin server action wrapper that reads the non-public env vars server-side and calls `signin` internally — server action wrapper is preferred so demo credentials never reach client JS). On success, redirect to `NEXT_PUBLIC_DASH_URL` exactly as the normal flow does.

## Video asset handling

- Source: `apps/demo/crwsync.webm` (dark) and `apps/demo/raw-light/*.webm` (light, currently per-beat clips — needs a light-theme composite equivalent to `crwsync.webm`, or dark-only ships first with light as a fast-follow).
- Copy the composite video into `apps/frontend/web/public/demo/` (static asset, not committed demo credentials — the video itself carries no secrets).
- Extract a poster JPG/WebP frame (e.g. from the B6 board or B9 home dashboard beat) for the hero thumbnail and as the `<video poster>`.
- Video element: `preload="none"`, `poster` set, native `<video controls>` inside the modal — no custom player needed given Framer Motion is already the animation library in use.
- 17MB is heavy for a landing page; flag as a follow-up to re-encode at a lower bitrate/resolution if load time becomes an issue, but do not block the redesign on video compression work.

## Accessibility notes

- `prefers-reduced-motion` fallback on the Architecture diagram (see above).
- Video modal: focus trap, `Escape` to close, focus returns to the trigger element on close.
- Semantic landmarks (`<header>`, `<main>`, `<nav>`, section `aria-label`s) — audit during implementation, not a copy-only change.
- Demo login button: clear `aria-label` distinguishing it from the real signup/signin CTAs so screen reader users understand it logs into a shared demo account, not their own.

## Out of scope

- Video compression/re-encoding pipeline.
- Light-theme video compositing if `raw-light` isn't already assembled into a single file.
- Dashboard app (`apps/frontend/dash`) changes — this spec is public marketing page only.
- New routes (`/pricing`, `/about` as a standalone page, etc.) — About the Builder stays a same-page anchor section, consistent with the existing single-page IA.

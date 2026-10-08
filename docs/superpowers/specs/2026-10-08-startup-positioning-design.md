# Startup positioning for the Claude for Startups application

## Goal

Make crwsync read as an early-stage, Claude-powered startup with a business path, on every public surface a program reviewer will see (homepage, README, license, roadmap), without inventing customers, metrics or prices.

## Scope (approach B)

1. License swap to FSL-1.1-ALv2.
2. Homepage: Claude section, hero mention, Plans teaser.
3. README rewrite in startup form.
4. ROADMAP monetization section.

Out of scope: a `/pricing` page, any invented price or metric, backend changes, a history rewrite of the repo.

## 1. License

- Replace `LICENSE` with the Functional Source License 1.1, Apache 2.0 future license (FSL-1.1-ALv2), licensor Tunya Lénárd-Sándor, copyright year 2026.
- Replace every PolyForm reference: README badge and section, footer link, JSON-LD `license` URL in `apps/frontend/web/app/page.tsx`, `license` fields in the package.json files, and any mention in `PRODUCT.md`, `SECURITY.md` or the legal pages found by grep.
- Link target: `https://fsl.software/`.
- README gets a one-line commercial contact using `NEXT_PUBLIC_CONTACT_EMAIL`'s default, `contact@crwsync.xyz`.

## 2. Homepage (apps/frontend/web)

All UI follows `DESIGN.md`: warm OKLCH tokens only, Figtree only, Ember Orange only on the single primary CTA and active states, glass gradient plus `border-[1.5px] border-foreground/10` plus `shadow-md shadow-black/5`, radii from the existing scale, Framer Motion blur-fade through the existing `Reveal`/`MotionRoot`. Built with the impeccable, frontend-design and ui-ux-pro-max skills, in that order of authority below `DESIGN.md`.

- **Claude section** (`components/home/claude.tsx`, placed in `app/page.tsx` between Surfaces and Architecture): uses `Section`, an eyebrow pill ("AI"), a headline, and four bento cards (chat summary, board digest, task drafts from messages, stand-up notes) in the same bento pattern as `surfaces.tsx`. Copy states that it runs on Claude, is optional, and runs only when a member triggers it. Copy must match `legal/privacy` section 5 and `legal/terms` section 6.
- **Hero**: one added line naming Claude-powered summaries and drafts. No layout change.
- **Plans teaser** (`components/home/plans.tsx`, next to `EarlyAccess`): one glass panel. Text: free during early access, paid plans for larger teams planned, join the waitlist. The CTA reuses the waitlist anchor. No prices.
- **Metadata**: update the description in `app/layout.tsx` and the JSON-LD description only if they omit Claude.
- Component names, file names and imports follow the repo conventions in `CLAUDE.md` (kebab-case files, `@/` aliases, double quotes, no comments).

## 3. README

New order: logo and tagline, one-paragraph pitch with the problem, status line (early access, waitlist, live demo link), "Claude-powered" feature list, business direction (free early access, paid tier planned, hosted versus self-host), architecture summary, quick start, license and commercial contact. Badges cut from sixteen to about five (Next.js, NestJS, TypeScript, PostgreSQL, license). The existing detailed feature list stays, moved below the pitch. No fabricated claims; every statement must be true of the running app or labelled as planned.

## 4. ROADMAP.md

Add a short "Business direction" section: free early access, a paid tier for larger teams, and the hosted-versus-self-host path. Mark everything as planned.

## Verification

`pnpm lint`, a typecheck and a web build must pass. No browser or Playwright testing, per the saved user preference. The user reviews the result visually.

## Manual steps for the user

- Inspect the committed `apps/frontend/.env.production` history and rotate anything secret.
- Fund and set `ANTHROPIC_API_KEY` on the deployed API so the AI features work on the demo.
- Create the real inbox or routing for `contact@crwsync.xyz`.
- Apply to the program from an `@crwsync.xyz` Console account using the root domain.

## Risks

- Relicensing: copies already taken under PolyForm stay under PolyForm. The author can relicense going forward. This is a product decision, not legal advice.
- The Claude section must not overclaim. If the demo account lacks a funded key the cards describe features that fail live; the manual step above covers it.

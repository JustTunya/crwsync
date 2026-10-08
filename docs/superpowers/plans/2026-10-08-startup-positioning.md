# Startup positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present crwsync as an early-stage, Claude-powered startup with a business path across license, homepage, README and roadmap, with no invented customers, metrics or prices.

**Architecture:** Copy and content changes plus one new presentational React component, `components/home/claude.tsx`, built from the existing `Section`/`Reveal` primitives and the same card styling `surfaces.tsx` already ships. No backend, API or data changes.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Framer Motion (`Reveal`), Hugeicons.

**Spec:** `docs/superpowers/specs/2026-10-08-startup-positioning-design.md`

## Global Constraints

- No inline or block comments (`CLAUDE.md`); double quotes, 2-space indent, semicolons; kebab-case file names; `@/` import aliases.
- Figtree only; warm OKLCH tokens only; Ember Orange (`primary`) only on the primary CTA, active states and small accents; every corner from the existing radius scale.
- New cards match the shipped components, which use `rounded-xl border border-border bg-card shadow-sm` (see `surfaces.tsx` `Frame`). Do not invent a new surface style.
- No invented prices, customers, metrics or testimonials. Everything not built is labelled "planned".
- AI copy must agree with `app/legal/privacy/page.tsx` section 5 and `app/legal/terms/page.tsx` section 6: optional, member-triggered, sent to Anthropic's API, output may be inaccurate.
- No browser or Playwright testing (saved user preference). Verify with lint, typecheck and build only.
- No commits unless the user asks; stage nothing.
- License: FSL-1.1-ALv2, licensor Tunya Lénárd-Sándor, year 2026, link `https://fsl.software/`.

## Review Focus

- Footer, terms page, README badge, JSON-LD and `LICENSE` all name the same license, with no PolyForm leftovers (Task 1 greps for it).
- The early-access copy no longer says "there is no pricing" now that a Plans note exists (Task 2 edits and greps for it).
- The Claude section stays readable at phone width: the grid collapses to one column (Task 2 uses `grid-cols-1 sm:grid-cols-2`).
- The Claude section does not claim the live demo runs AI; it says "in workspaces where the operator enables it" (Task 2 copy).
- `pnpm lint` and the web build pass with the new component (Task 4).

---

### Task 1: License swap to FSL-1.1-ALv2

**Files:**
- Modify: `LICENSE` (full replace)
- Modify: `apps/frontend/web/app/page.tsx:39`
- Modify: `apps/frontend/web/components/home/footer.tsx:44-53`
- Modify: `apps/frontend/web/app/legal/terms/page.tsx:104-108`
- Modify: `PRODUCT.md:71-72`

**Interfaces:**
- Produces: license name string "Functional Source License 1.1, Apache 2.0 future license" and URL `https://fsl.software/` used by Tasks 2 and 3.

- [ ] **Step 1: Fetch the official template**

Use WebFetch on `https://raw.githubusercontent.com/getsentry/fsl.software/main/FSL-1.1-ALv2.template.md` with the prompt "Return the complete license text verbatim." If that URL fails, fetch `https://fsl.software/FSL-1.1-ALv2.template.md`.

- [ ] **Step 2: Write `LICENSE`**

Replace the whole file with the fetched text, setting the copyright line to `Copyright 2026 Tunya Lénárd-Sándor` and the licensor name the same. Keep the text otherwise verbatim.

- [ ] **Step 3: Update `app/page.tsx` JSON-LD**

Change line 39 to:

```tsx
  license: "https://fsl.software/",
```

- [ ] **Step 4: Update the footer**

Replace the `Link` text `PolyForm Noncommercial License 1.0.0` with `Functional Source License 1.1 (Apache 2.0 future license)`.

- [ ] **Step 5: Update the terms page section 11**

Replace the paragraph with:

```tsx
        <p>
          crwsync&apos;s source is public under the Functional Source License 1.1 (Apache 2.0 future license). You may
          read, study, and use it for any purpose except offering a competing product or service, and each release
          becomes Apache 2.0 two years after it is published. Commercial licensing is available from the author.
        </p>
```

- [ ] **Step 6: Update `PRODUCT.md`**

Replace the licensing bullet (line 71 onward, through its continuation line) with:

```
- Licensed under FSL-1.1-ALv2 (Functional Source License, Apache 2.0 future
  license) — source is public to read and use except for competing offerings;
  each release converts to Apache 2.0 after two years.
```

- [ ] **Step 7: Verify no PolyForm leftover**

Run: `git grep -nIi polyform -- . ':!pnpm-lock.yaml' ':!README.md'`
Expected: no output (README is handled in Task 3).

---

### Task 2: Homepage Claude section, hero line and plans copy

**Files:**
- Create: `apps/frontend/web/components/home/claude.tsx`
- Modify: `apps/frontend/web/app/page.tsx` (import and section wiring)
- Modify: `apps/frontend/web/components/home/hero.tsx` (paragraph)
- Modify: `apps/frontend/web/components/home/early-access.tsx` (left column copy)
- Modify: `apps/frontend/web/app/layout.tsx` and `app/page.tsx` description strings only if they omit Claude

**Interfaces:**
- Consumes: `Section({ id, title, lead, children })` from `@/components/home/section`, `Reveal` from `@/components/home/reveal`.
- Produces: `export function Claude()` from `@/components/home/claude`.

- [ ] **Step 1: Confirm the icons exist**

Run: `git grep -c "Calendar01Icon\|Chat01Icon\|File01Icon\|CheckmarkSquare02Icon" -- apps/frontend/web/components`
Then check the package exports: `node -e "const i=require('@hugeicons/core-free-icons');console.log(['Calendar01Icon','Chat01Icon','File01Icon','CheckmarkSquare02Icon'].map(n=>n+':'+!!i[n]).join(' '))"` from `apps/frontend/web`.
Expected: all four `true`. If `Calendar01Icon` is false, use `Clock01Icon` after the same check.

- [ ] **Step 2: Create `claude.tsx`**

```tsx
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Chat01Icon, CheckmarkSquare02Icon, File01Icon } from "@hugeicons/core-free-icons";

const FEATURES = [
  {
    icon: Chat01Icon,
    title: "Chat summaries",
    detail: "Catch up on a busy room in a few lines instead of scrolling a day of messages.",
  },
  {
    icon: File01Icon,
    title: "Board digests",
    detail: "What moved, what is stuck, and what is due, written from the board's real activity.",
  },
  {
    icon: CheckmarkSquare02Icon,
    title: "Task drafts from messages",
    detail: "Turn a thread into draft tasks. Nothing is created until a member confirms.",
  },
  {
    icon: Calendar01Icon,
    title: "Stand-up notes",
    detail: "A short yesterday, today, and blockers note assembled from what the crew actually did.",
  },
];

export function Claude() {
  return (
    <div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground/8 text-foreground">
              <HugeiconsIcon icon={feature.icon} className="size-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{feature.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[64ch] text-sm text-muted-foreground">
        Powered by Claude through the Anthropic API, called from the server only. Available in workspaces where the
        operator enables it, and it runs only when a member asks. AI output can be wrong, so check it before acting.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `app/page.tsx`**

Add the import next to the other home imports:

```tsx
import { Claude } from "@/components/home/claude";
```

Insert between the `product` section and `<EarlyAccess />`:

```tsx
          <Section
            id="ai"
            title="Claude reads the room so you do not have to"
            lead="Optional AI features for the work a small crew repeats every day: catching up, planning the day, and turning conversation into tasks."
          >
            <Reveal>
              <Claude />
            </Reveal>
          </Section>
```

- [ ] **Step 4: Add the hero line**

In `hero.tsx`, append to the paragraph, after "without a refresh.": ` Optional Claude-powered summaries, digests, and task drafts keep long threads and busy boards readable.`

- [ ] **Step 5: Edit the early-access copy**

In `early-access.tsx` replace the paragraph with:

```tsx
          <p className="mt-5 max-w-[56ch] text-base sm:text-lg text-muted-foreground text-pretty">
            crwsync is not open for general sign-up yet. Early access is free and nothing is charged today; paid plans
            for larger teams are planned. Leave your email and we will write when early access opens. We store only what
            this form collects and use it only for that.
          </p>
```

Deviation from the spec: the Plans teaser is folded into this existing paragraph instead of a new `plans.tsx` panel. It carries the same message with one fewer file.

- [ ] **Step 6: Check descriptions mention Claude**

Run: `git grep -n "description" -- apps/frontend/web/app/layout.tsx apps/frontend/web/app/page.tsx`
If a description omits Claude, append "with optional Claude-powered summaries" to the shortest one in `layout.tsx` only. Otherwise leave unchanged.

- [ ] **Step 7: Verify copy conflicts**

Run: `git grep -n "no pricing" -- apps/frontend`
Expected: no output.

---

### Task 3: README rewrite

**Files:**
- Modify: `README.md` (top through "About", badges, license section)

**Interfaces:**
- Consumes: license name and URL from Task 1.

- [ ] **Step 1: Replace lines 1-50 (header, badges, About)**

New content, in order:
1. The existing `<picture>` logo block.
2. `### The shared workspace for small teams, with Claude built in`
3. One paragraph: boards, chat, files and schedules in one place, live in every open tab, with optional Claude-powered summaries, digests, task drafts and stand-up notes. Status line: "Early access. Built by [Tunya Lénárd-Sándor](https://www.linkedin.com/in/lenard-tunya/). [Join the waitlist](https://crwsync.xyz/#early-access) or try the demo."
4. Five badges only: Next.js, NestJS, TypeScript, PostgreSQL, and `License: FSL-1.1-ALv2` linking to `LICENSE` with shield URL `https://img.shields.io/badge/License-FSL--1.1--ALv2-B93826?style=flat&labelColor=1A1816`. Reuse the existing badge URLs for the first four.
5. `## Why crwsync`: small teams lose context between a tracker, a chat app and a file drive; crwsync keeps them in one workspace and uses Claude to keep long threads and busy boards readable.
6. `## Claude-powered` : four bullets (chat summaries, board digests, task drafts from messages, stand-up notes), each one sentence, plus "Optional, off by default, runs server-side, member-triggered. See [AI features](#ai-features-optional)."
7. `## Business direction`: free early access today; a paid tier for larger teams is planned; a hosted product with a self-host path; all marked planned, no prices. Commercial licensing or partnership: contact@crwsync.xyz.
8. Keep the existing `## About` architecture paragraph, retitled `## Architecture at a glance`, then the unchanged `## Features` and everything below it.

- [ ] **Step 2: Replace the license section (last lines)**

```
## License

Source-available under the [Functional Source License 1.1, Apache 2.0 future license](LICENSE) (FSL-1.1-ALv2). You can read, study and use the code for any purpose except offering a competing product or service; each release converts to Apache 2.0 two years after publication. Commercial licensing: contact@crwsync.xyz.
```

- [ ] **Step 3: Verify**

Run: `git grep -nIi polyform -- .`
Expected: no output (lockfile excluded by earlier tasks; none in it).

---

### Task 4: ROADMAP business section and verification

**Files:**
- Modify: `ROADMAP.md` (append after the last section)

- [ ] **Step 1: Append section 7**

```
## 7. Business Direction (Planned)

- **Now:** free early access through the waitlist; the shared demo shows the product with sample data.
- **Next:** a paid tier for larger teams, with limits and pricing to be decided from waitlist feedback.
- **Later:** a hosted product with a documented self-host path under FSL-1.1-ALv2.
- AI features stay optional, member-triggered and capped per user per day, so cost per workspace stays predictable.
```

- [ ] **Step 2: Lint**

Run from the repo root: `pnpm lint`
Expected: exits 0 with no errors.

- [ ] **Step 3: Typecheck and build the web app**

Run: `pnpm --filter @crwsync/web exec tsc --noEmit` then `pnpm --filter @crwsync/web build`
(Use the web package's real name from `apps/frontend/web/package.json` if it differs.)
Expected: both succeed. On Windows the memory file notes a build flag quirk; apply it if the build fails for that reason.

- [ ] **Step 4: Report**

Run `git status --short` and list the changed files. Do not commit; ask the user whether to commit.

# Marketing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure crwsync's public marketing page (`apps/frontend/web`) to lead with an evaluator-first pitch for recruiters/freelance clients, add a one-click live demo login and an embedded product walkthrough video, and clean up voice/dead-code issues found in the audit.

**Architecture:** Pure frontend change inside `apps/frontend/web`. No new backend endpoints — the demo login reuses the existing client-side `signin()` call already used by `SigninForm`. Two new sections (Proof strip, About the Builder) are inserted into the existing single-page `app/page.tsx` composition; Architecture and Features sections get targeted edits; Contact and Footer get trims. A finished-but-unused demo video (`apps/demo/crwsync.webm`) gets copied into `public/` and surfaced via a native `<dialog>`-based modal — no new video-player dependency.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4, Framer Motion. No test runner is configured for `apps/frontend/web` — per-task verification is `eslint` + `tsc --noEmit`; there is no unit/component test suite to extend for this app, so tasks do not include a test-writing step.

**Spec:** `docs/superpowers/specs/2026-09-08-marketing-page-redesign-design.md`

## Global Constraints

- **One Ember Rule:** Ember Orange (`--primary`) only on the primary CTA, active states, logo, and the architecture diagram's signal beam — never as a large fill.
- **Warm-Only Rule:** every neutral (background/border/muted) stays in the existing warm OKLCH hue family — never introduce a cold gray.
- **Glass-Not-Card Rule:** new surfaces use the translucent-gradient + hairline-border + backdrop-blur pattern (`bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5`), matching existing eyebrow pills and glass cards — not solid `bg-card` + hard shadow.
- **One Voice Rule:** Figtree only, no second typeface.
- **Imports:** absolute via the `@/` path alias for every new import (per `CLAUDE.md`) — existing files with relative imports being fully rewritten in this plan get their imports switched to `@/` as part of that rewrite; files getting small in-place edits keep their existing import style untouched.
- **No inline/block comments** except a short trailing comment on a magic number's unit, per `CLAUDE.md`.
- **Verification per task:** `pnpm --filter @crwsync/web lint` and `npx tsc --noEmit -p apps/frontend/web/tsconfig.json`, run from the repo root. Full behavioral verification (does the demo login actually authenticate, does the video play) requires the local stack running (`pnpm dev` + `pnpm demo:seed`) and is a manual step in the final task, not something every task re-runs.
- **Demo credentials never get hardcoded in source.** They're read from `NEXT_PUBLIC_DEMO_IDENTIFIER` / `NEXT_PUBLIC_DEMO_PASSWORD` env vars (values copied from `.env.demo`'s `DEMO_OWNER_USERNAME` / `DEMO_OWNER_PASSWORD` into the gitignored `apps/frontend/web/.env` for local dev, and into the production deploy env separately — out of scope for this plan's tasks).

---

## Task 1: `usePrefersReducedMotion` hook

**Files:**
- Create: `apps/frontend/web/hooks/use-prefers-reduced-motion.tsx`

**Interfaces:**
- Produces: `usePrefersReducedMotion(): boolean` — a client hook mirroring the existing `useMobile()` pattern in `hooks/use-mobile.tsx`, used by Task 2 to gate the Architecture diagram's animation.

- [ ] **Step 1: Write the hook**

```tsx
"use client";

import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);

    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
```

- [ ] **Step 2: Verify**

Run from repo root:
```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Expected: both pass with no errors (this file isn't imported anywhere yet, so this only checks syntax/types).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/web/hooks/use-prefers-reduced-motion.tsx
git commit -m "$(cat <<'EOF'
feat(web): add usePrefersReducedMotion hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 2: Architecture diagram — `prefers-reduced-motion` fallback

**Files:**
- Modify: `apps/frontend/web/components/home/architecture.tsx:143-357` (the `Card` and `Connector` sub-components)

**Interfaces:**
- Consumes: `usePrefersReducedMotion(): boolean` from Task 1 (`@/hooks/use-prefers-reduced-motion`).

- [ ] **Step 1: Import the hook**

At the top of `architecture.tsx`, add to the existing import block:

```tsx
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
```

- [ ] **Step 2: Gate `Card`'s entrance animation**

In the `Card` function (currently starting at line 143), add the hook call and use it to zero out the animation when motion is reduced — keep the JSX structure identical, only change the `motion.div` props:

```tsx
function Card({
  id,
  i,
  icon,
  label,
  tech,
  desc,
  fillIcon,
  children
}: {
  id?: string;
  i: number;
  icon: IconSvgElement | string;
  label: string;
  tech?: string;
  desc?: string;
  fillIcon?: boolean;
  children?: React.ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      id={id}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : i * 0.15 }}
      className="flex flex-col items-center justify-center min-h-24 lg:min-h-26 h-full w-30 lg:w-36 p-2 text-center rounded-2xl shadow-xl border-[1.5px] border-foreground/10 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 backdrop-blur-md"
    >
      <div className="p-2 mb-2 bg-foreground/10 text-foreground rounded-full">
        {typeof icon === "string" ? (
          <div 
            className="size-6 bg-current" 
            style={{ 
              WebkitMaskImage: `url(${icon})`, 
              maskImage: `url(${icon})`, 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        ) : (
          <HugeiconsIcon icon={icon} strokeWidth={1.5} fill={fillIcon ? "currentColor" : "none"} className="text-xs" />
        )}
      </div>
      <span className="text-xs font-semibold text-foreground leading-relaxed line-clamp-1">
        {label}
      </span>
      {tech && (
        <span className="text-[10px] text-muted-foreground text-balance tracking-tight leading-tight line-clamp-2">
          {tech}
        </span>
      )}
      {desc && (
        <span className="text-[10px] text-muted-foreground text-balance tracking-tight leading-tight line-clamp-2">
          {desc}
        </span>
      )}
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Gate `Connector`'s beam/dashed animation**

In the `Connector` function, add the hook call near the other hooks, then update the render section (everything from `if (!coords) return null;` down) so the animated beam layers and the dashed marching-ants are skipped when motion is reduced — the static background path always renders:

```tsx
  const reducedMotion = usePrefersReducedMotion();

  if (!coords) return null;

  const { x1, y1, x2, y2 } = coords;
  const deltaX = Math.abs(x2 - x1);
  const deltaY = Math.abs(y2 - y1);
  const h = rightLoop ? deltaY * curve : deltaX * curve;
  const data = rightLoop 
    ? `M ${x1} ${y1} C ${x1 + h + offsetX} ${y1}, ${x2 + h + offsetX} ${y2}, ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1 + h - offsetX} ${y1}, ${x2 - h - offsetX} ${y2}, ${x2} ${y2}`;
  const dyValue = rightLoop ? 12 : -4;
  const isReversed = x1 > x2;
  const finalDy = isReversed ? -dyValue : dyValue;

  const textData = isReversed
    ? (rightLoop
        ? `M ${x2} ${y2} C ${x2 + h + offsetX} ${y2}, ${x1 + h + offsetX} ${y1}, ${x1} ${y1}`
        : `M ${x2} ${y2} C ${x2 - h - offsetX} ${y2}, ${x1 + h - offsetX} ${y1}, ${x1} ${y1}`)
    : data;

  const beamDuration = 2;
  const initialDelay = (delayOrder || 0) * beamDuration;
  const repeatDelay = beamDuration;
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {label && <path id={pathId} d={textData} fill="none" stroke="none" />}
      {/* Background static line */}
      <motion.path
        d={data}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={dashed ? "5 5" : undefined}
        initial={dashed && !reducedMotion ? { strokeDashoffset: 0 } : undefined}
        animate={dashed && !reducedMotion ? { strokeDashoffset: -10 } : {}}
        transition={dashed && !reducedMotion ? { repeat: Infinity, duration: 0.4, ease: "linear" } : {}}
      />
      
      {/* Animated Light Beam for non-dashed lines */}
      {!dashed && !reducedMotion && (
        <>
          {/* Faded edges tail */}
          <motion.path
            d={data}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity={0.2}
            initial={{ pathLength: 0.2, pathOffset: -0.2 }}
            animate={{ pathOffset: 1 }}
            transition={{ repeat: Infinity, duration: beamDuration, delay: initialDelay, repeatDelay, ease: "linear" }}
          />
          {/* Core bright beam with glow */}
          <motion.path
            d={data}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px var(--primary))" }}
            initial={{ pathLength: 0.1, pathOffset: -0.15 }}
            animate={{ pathOffset: 1.05 }}
            transition={{ repeat: Infinity, duration: beamDuration, delay: initialDelay, repeatDelay, ease: "linear" }}
          />
        </>
      )}

      {label && (
        <text 
          className="text-[10px] font-medium fill-muted-foreground" 
          dy={finalDy}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      )}
    </svg>
  );
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Then manually: `pnpm --filter @crwsync/web dev`, open `http://localhost:3000#architecture` with your OS's "reduce motion" setting on (macOS: System Settings → Accessibility → Display → Reduce Motion; Windows: Settings → Accessibility → Visual effects → Animation effects off) — the diagrams should render fully populated with static lines, no beam or marching-ants. With reduce-motion off, existing animated behavior should be unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/web/components/home/architecture.tsx
git commit -m "$(cat <<'EOF'
feat(web): respect prefers-reduced-motion on architecture diagram

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 3: Demo video asset + `DemoVideoDialog`

**Files:**
- Create: `apps/frontend/web/public/demo/crwsync.webm` (copied binary asset)
- Create: `apps/frontend/web/public/demo/poster.jpg` (extracted binary asset)
- Create: `apps/frontend/web/components/home/demo-video-dialog.tsx`

**Interfaces:**
- Produces: `DemoVideoDialog` — a `forwardRef<HTMLDialogElement>` component. Callers get a `dialogRef` and call `dialogRef.current?.showModal()` to open it; the dialog closes itself on Escape (native), backdrop click, or its own close button. Used by Task 5 (Hero).

- [ ] **Step 1: Copy the video asset**

```bash
mkdir -p apps/frontend/web/public/demo
cp apps/demo/crwsync.webm apps/frontend/web/public/demo/crwsync.webm
```

- [ ] **Step 2: Extract a poster frame**

Uses `ffmpeg` (already part of this repo's demo-recording toolchain per `apps/demo/SHOTLIST.md`). Frame at 78.5s lands inside beat B9 — the home dashboard with Pinned Modules and Quick Stats visible, the most representative single frame of the product:

```bash
ffmpeg -y -ss 78.5 -i apps/demo/crwsync.webm -frames:v 1 -q:v 3 apps/frontend/web/public/demo/poster.jpg
```

Expected: `apps/frontend/web/public/demo/poster.jpg` exists and opens as a valid JPEG showing the dashboard.

- [ ] **Step 3: Write the dialog component**

```tsx
"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export const DemoVideoDialog = forwardRef<HTMLDialogElement>((_props, ref) => {
  const innerRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => innerRef.current as HTMLDialogElement);

  const close = () => innerRef.current?.close();

  return (
    <dialog
      ref={innerRef}
      onClick={(e) => {
        if (e.target === innerRef.current) close();
      }}
      onClose={() => videoRef.current?.pause()}
      className="backdrop:bg-foreground/40 backdrop:backdrop-blur-sm bg-transparent p-0 open:flex rounded-2xl"
    >
      <div className="relative w-[min(92vw,64rem)] bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-blur-md backdrop-saturate-100 shadow-xl/5 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={close}
          aria-label="Close video"
          className="absolute top-3 right-3 z-10 p-1.5 bg-background/60 text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
        </button>
        <video
          ref={videoRef}
          controls
          preload="none"
          poster="/demo/poster.jpg"
          className="w-full h-auto block"
        >
          <source src="/demo/crwsync.webm" type="video/webm" />
        </video>
      </div>
    </dialog>
  );
});

DemoVideoDialog.displayName = "DemoVideoDialog";
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Expected: both pass (component isn't wired into a page yet, so this checks syntax/types only — behavioral check happens in Task 5).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/web/public/demo/crwsync.webm apps/frontend/web/public/demo/poster.jpg apps/frontend/web/components/home/demo-video-dialog.tsx
git commit -m "$(cat <<'EOF'
feat(web): add demo walkthrough video asset and DemoVideoDialog

Copies the finished 86s product walkthrough (apps/demo/crwsync.webm,
previously unreferenced anywhere in the app) into the public web app and
adds a native <dialog>-based click-to-play modal for it — no new
video-player dependency.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 4: `TryDemoButton`

**Files:**
- Create: `apps/frontend/web/components/home/try-demo-button.tsx`
- Modify: `apps/frontend/web/.env` (local, gitignored — not part of the commit)

**Interfaces:**
- Consumes: `signin(prev: SigninState, data: SigninPayload): Promise<SigninState>` from `@/services/auth.service` (existing); `SigninState` from `@crwsync/types` (existing).
- Produces: `TryDemoButton` — a self-contained client component (no props) rendering the button and its own inline error message. Used by Task 5 (Hero).

- [ ] **Step 1: Add local env vars**

Append to `apps/frontend/web/.env` (this file is gitignored — do not commit it), using the values from your local `.env.demo`'s `DEMO_OWNER_USERNAME` / `DEMO_OWNER_PASSWORD`:

```
NEXT_PUBLIC_DEMO_IDENTIFIER=<DEMO_OWNER_USERNAME value from .env.demo>
NEXT_PUBLIC_DEMO_PASSWORD=<DEMO_OWNER_PASSWORD value from .env.demo>
```

- [ ] **Step 2: Write the component**

```tsx
"use client";

import { useEffect, useActionState, startTransition } from "react";
import { SigninState } from "@crwsync/types";
import { signin } from "@/services/auth.service";

const initState: SigninState = { success: false, errors: {}, message: "" };

const DEMO_IDENTIFIER = process.env.NEXT_PUBLIC_DEMO_IDENTIFIER;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

export function TryDemoButton() {
  const [state, dispatch, pending] = useActionState(signin, initState);
  const DASH_URL = process.env.NEXT_PUBLIC_DASH_URL!;

  useEffect(() => {
    if (state.success) window.location.assign(DASH_URL);
  }, [state.success, DASH_URL]);

  const handleClick = () => {
    if (!DEMO_IDENTIFIER || !DEMO_PASSWORD) return;
    startTransition(() => {
      dispatch({ identifier: DEMO_IDENTIFIER, password: DEMO_PASSWORD, rememberMe: false });
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label="Sign in to a shared live demo account, not your own"
        className="group relative bg-primary p-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm text-primary-foreground font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-lg transition-colors" />
        {pending ? "Signing in…" : "Try Live Demo"}
      </button>
      {!state.success && state.message && (
        <span className="text-xs text-error">{state.message}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/web/components/home/try-demo-button.tsx
git commit -m "$(cat <<'EOF'
feat(web): add TryDemoButton, one-click login to the seeded demo account

Reuses the existing client-side signin() call from services/auth.service.tsx
(the same one SigninForm uses) with a fixed payload from
NEXT_PUBLIC_DEMO_IDENTIFIER/PASSWORD — no new backend endpoint.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 5: Hero rewrite

**Files:**
- Modify: `apps/frontend/web/components/home/hero.tsx` (full rewrite, 30 lines)

**Interfaces:**
- Consumes: `TryDemoButton` from `@/components/home/try-demo-button` (Task 4); `DemoVideoDialog` from `@/components/home/demo-video-dialog` (Task 3).

- [ ] **Step 1: Rewrite the file**

```tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import { Ripple } from "@/components/ui/ripple";
import { TryDemoButton } from "@/components/home/try-demo-button";
import { DemoVideoDialog } from "@/components/home/demo-video-dialog";

export default function Hero() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openDemo = () => dialogRef.current?.showModal();

  return (
    <section className="flex flex-col gap-12 px-6 sm:px-12 py-24 items-center justify-center min-h-screen relative">
      <Ripple />
      <div className="max-w-4xl space-y-4 flex flex-col items-center">
        <h1 className="text-balanced text-center text-5xl md:text-6xl text-foreground font-bold tracking-tight leading-tighter">
          Production-grade, built solo.{' '}<span className="text-primary">See how.</span>
        </h1>

        <p className="text-balance text-center text-sm sm:text-base lg:text-[1.1rem] text-muted-foreground font-medium tracking-tight leading-tight sm:leading-normal">
          crwsync is a fictional real-time collaboration platform, engineered end to end — public portal, authenticated dashboard, and a horizontally scalable backend — to prove out full-stack and infrastructure ability.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
          <TryDemoButton />
          <button
            type="button"
            onClick={openDemo}
            className="px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground border-[1.5px] border-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer"
          >
            Watch the walkthrough
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openDemo}
        aria-label="Watch the 86-second product walkthrough"
        className="group relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border-[1.5px] border-foreground/10 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 backdrop-blur-md backdrop-saturate-100 shadow-xl/5 cursor-pointer"
      >
        <Image
          src="/demo/poster.jpg"
          alt="crwsync product walkthrough preview"
          fill
          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center justify-center size-16 bg-primary rounded-full shadow-lg shadow-black/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="size-6 fill-primary-foreground translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>

      <DemoVideoDialog ref={dialogRef} />
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Then manually: `pnpm --filter @crwsync/web dev`, open `http://localhost:3000`. Confirm: new headline/copy render, the poster thumbnail and "Watch the walkthrough" button both open the video modal, Escape and the modal's close button both close it, and (with the local stack + `pnpm demo:seed` running) "Try Live Demo" redirects to the dashboard signed in as the demo owner.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/web/components/home/hero.tsx
git commit -m "$(cat <<'EOF'
feat(web): rewrite hero for evaluator-first positioning

Leads with the portfolio claim instead of the in-fiction SaaS pitch, adds
the Try Live Demo / Watch the walkthrough CTA pair, and a click-to-play
poster thumbnail for the product walkthrough video.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 6: Proof strip

**Files:**
- Create: `apps/frontend/web/components/home/proof-strip.tsx`
- Modify: `apps/frontend/web/app/page.tsx`

**Interfaces:**
- Produces: `ProofStrip` (default export, no props) — inserted into `app/page.tsx` between `<Hero />` and `<Features />`.

- [ ] **Step 1: Write the component**

```tsx
const stack = ["Next.js", "NestJS", "PostgreSQL", "Redis", "Socket.IO", "Prisma", "Docker"];

export default function ProofStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-6 max-w-4xl mx-auto text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide">
      {stack.map((tech, i) => (
        <span key={tech} className="flex items-center gap-3">
          {i > 0 && <span className="size-1 rounded-full bg-muted-foreground/40" aria-hidden="true" />}
          {tech}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `page.tsx`**

```tsx
import dynamic from "next/dynamic";
import Header from "@/components/home/header";
import Hero from "@/components/home/hero";
import ProofStrip from "@/components/home/proof-strip";
import Features from "@/components/home/features";
import Architecture from "@/components/home/architecture";
import Contact from "@/components/home/contact";

const Footer = dynamic(() => import("@/components/home/footer"), {
  loading: () => <div className="h-32 bg-base-200/50 animate-pulse" />,
  ssr: true,
});

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <ProofStrip />
        <Features />
        <Architecture />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Then manually: confirm the quiet stack-name row renders directly under the hero.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/web/components/home/proof-strip.tsx apps/frontend/web/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): add proof strip below hero

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 7: Features copy tightening

**Files:**
- Modify: `apps/frontend/web/components/home/features.tsx:6-31`

- [ ] **Step 1: Tighten three of the five card descriptions**

Replace the `cards` object (lines 5-31) with:

```tsx
const cards = {
  chat: {
    name: "Real-Time Chat & Messaging",
    description: "Teammates communicate instantly in dedicated chat rooms, live over WebSockets.",
    icon: "/Paperplane.svg",
  },
  kanban: {
    name: "Kanban Task Boards",
    description: "Visualize workflows, track progress, and manage tasks with drag-and-drop ease.",
    icon: "/PieChart.svg",
  },
  workspaces: {
    name: "Collaborative Workspaces",
    description: "Manage projects and role-based access within isolated workspaces.",
    icon: "/Link.svg",
  },
  scheduling: {
    name: "Project Scheduling",
    description: "Track timelines and deadlines with built-in calendars and schedules.",
    icon: "/Calendar.svg",
  },
  notifications: {
    name: "Notifications",
    description: "Keeps everyone updated on activity and mentions, in real time.",
    icon: "/Bell.svg",
  },
};
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/web/components/home/features.tsx
git commit -m "$(cat <<'EOF'
fix(web): tighten feature card copy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 8: About the Builder section + header nav link

**Files:**
- Create: `apps/frontend/web/components/home/about.tsx`
- Modify: `apps/frontend/web/components/home/header.tsx:122-169` (`NavMenu` and `menuItems`)
- Modify: `apps/frontend/web/app/page.tsx`

**Interfaces:**
- Produces: `About` (default export, no props) — inserted into `app/page.tsx` between `<Architecture />` and `<Contact />`, anchor id `about`.

- [ ] **Step 1: Write the About component**

Content here is grounded in what already exists in the repo: name and links from the current footer, the personal blurb moved verbatim from `contact.tsx` (see Task 9, which removes it from there), and the project-description line adapted from `README.md`'s own "About" section wording.

```tsx
import Link from "next/link";

export default function About() {
  return (
    <section id="about" className="flex flex-col items-center gap-8 px-6 sm:px-12 pt-6 pb-12">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          About the Builder
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-2xl w-full p-8 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-xl text-center">
        <h1 className="text-3xl lg:text-4xl font-bold">Tunya Lénárd-Sándor</h1>
        <p className="text-sm text-muted-foreground tracking-wide">
          Engineered crwsync end to end — public portal, authenticated dashboard, and a horizontally scalable real-time backend — solo.
        </p>
        <p className="text-sm lg:text-base text-muted-foreground text-balance leading-tight max-w-xl">
          I&apos;m always open to new opportunities and collaborations. Feel free to reach out if you have any questions or would like to discuss potential projects.
        </p>

        <div className="flex items-center gap-6 mt-2">
          <Link
            href="https://github.com/justtunya/crwsync"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            View Source
          </Link>
          <Link
            href="https://www.linkedin.com/in/lenard-tunya/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            LinkedIn
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add "About" to the desktop nav**

In `header.tsx`, inside `NavMenu` (around line 130), add a new `NavigationMenuItem` between the Architecture and Contact items:

```tsx
  return (
    <NavigationMenu>
      <NavigationMenuList className="flex items-center justify-center lg:gap-6">
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="#features">Features</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="#architecture">Architecture</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "hidden lg:inline-flex")}>
            <Link href="#about">About</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "hidden lg:inline-flex")}>
            <Link href="#contact">Contact</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
```

- [ ] **Step 3: Add "About" to the mobile menu**

In `header.tsx`, update the `menuItems` array (around line 156):

```tsx
const menuItems = [
  {
    href: "#features",
    title: "Features",
  },
  {
    href: "#architecture",
    title: "Architecture",
  },
  {
    href: "#about",
    title: "About",
  },
  {
    href: "#contact",
    title: "Contact",
  },
];
```

- [ ] **Step 4: Wire `About` into `page.tsx`**

```tsx
import dynamic from "next/dynamic";
import Header from "@/components/home/header";
import Hero from "@/components/home/hero";
import ProofStrip from "@/components/home/proof-strip";
import Features from "@/components/home/features";
import Architecture from "@/components/home/architecture";
import About from "@/components/home/about";
import Contact from "@/components/home/contact";

const Footer = dynamic(() => import("@/components/home/footer"), {
  loading: () => <div className="h-32 bg-base-200/50 animate-pulse" />,
  ssr: true,
});

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <ProofStrip />
        <Features />
        <Architecture />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Then manually: confirm "About" appears in both the desktop nav and the mobile hamburger menu, and clicking it scrolls to the new section between Architecture and Contact.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/web/components/home/about.tsx apps/frontend/web/components/home/header.tsx apps/frontend/web/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): add About the Builder section

Gives the personal intro copy (moved out of Contact) a proper heading and
transition instead of an unannounced voice switch, and surfaces
GitHub/LinkedIn links directly.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 9: Trim Contact to form-only

**Files:**
- Modify: `apps/frontend/web/components/home/contact.tsx:41-81`

- [ ] **Step 1: Replace the section JSX**

Replace everything from the opening `<section id="contact" ...>` tag through its closing `</section>` (lines 41-81) — the `handleSubmit` function and state above it are unchanged:

```tsx
  return (
    <section id="contact" className="flex flex-col items-center gap-8 px-6 sm:px-12 pt-6 pb-12">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          Contact
        </span>
      </div>

      <div className="flex flex-col gap-4 max-w-lg w-full p-8 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-xl">
        <h1 className="text-2xl lg:text-3xl font-bold text-center">Send a message</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs sm:text-sm font-light tracking-tight">Full Name</label>
            <input type="text" id="name" name="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-1.5 text-sm bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs sm:text-sm font-light tracking-tight">Email</label>
            <input type="email" id="email" name="email" placeholder="johndoe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-1.5 text-sm bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-xs sm:text-sm font-light tracking-tight">Message</label>
            <textarea id="message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Share your thoughts, ideas, or any questions you may have." className="px-3 py-1.5 text-sm bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-md"></textarea>
          </div>
          <button type="submit" disabled={!name || !email || !message || isSubmitting} className="group relative px-3 py-1.5 text-sm text-primary-foreground font-semibold foregroundspace-nowrap bg-primary rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-lg transition-colors" />
            {isSubmitting ? "Sending..." : "Send"}
          </button>
          {feedback && (
            <p className={`flex items-center justify-center gap-2 text-sm text-center py-1 border backdrop-saturate-100 rounded-md ${feedback.type === "error" ? "text-error bg-error/10 border-error" : "text-success bg-success/10 border-success"}`}>
              <HugeiconsIcon icon={feedback.type === "error" ? CancelCircleIcon : CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              {feedback.text}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```
Then manually: confirm Contact now shows only the form in a single centered column, and that the form still submits successfully (existing `submitContactMessage` behavior unchanged).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/web/components/home/contact.tsx
git commit -m "$(cat <<'EOF'
fix(web): trim Contact to form-only

Personal intro copy moved to the new About the Builder section (Task 8) —
this removes the abrupt voice switch that used to happen mid-Contact.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 10: Footer dead-code cleanup

**Files:**
- Modify: `apps/frontend/web/components/home/footer.tsx`

- [ ] **Step 1: Remove the commented-out `socials`/`categories` blocks and the commented-out grid**

Replace the entire file contents with:

```tsx
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="grid grid-cols-1 md:grid-cols-2 items-center sm:justify-between gap-x-32 gap-y-16 bg-foreground dark:bg-background border-t border-base-300 px-8 sm:px-24 lg:px-32 py-16">
      <div className="flex flex-col items-center gap-2">
        <Link href="/">
          <Image src="/logo@white.svg" alt="crwsync" width={3250} height={512} className="h-7 xl:h-8 md:w-auto" priority />
        </Link>

        <p className="text-xs text-foreground font-light">© 2026 Tunya Lénárd-Sándor. All rights reserved.</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Link href="https://github.com/justtunya/crwsync">
          <div 
            className="size-6 bg-current" 
            style={{ 
              WebkitMaskImage: "url(/github.svg)", 
              maskImage: "url(/github.svg)", 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        </Link>

        <Link href="https://www.linkedin.com/in/lenard-tunya/">
          <div 
            className="size-8 bg-current" 
            style={{ 
              WebkitMaskImage: "url(/linkedin.svg)", 
              maskImage: "url(/linkedin.svg)", 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        </Link>
      </div>
    </footer>
  );
}
```

This is a pure deletion of dead code (the commented-out `socials`/`categories` arrays and their commented-out render block) — the live GitHub/LinkedIn links and copyright line are unchanged.

- [ ] **Step 2: Verify**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/web/components/home/footer.tsx
git commit -m "$(cat <<'EOF'
fix(web): remove dead commented-out footer markup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011waeZWY7izyAeedBmYdMdH
EOF
)"
```

---

## Task 11: Full-page manual verification

**Files:** none (verification only, no code changes)

- [ ] **Step 1: Full lint + typecheck pass**

```bash
pnpm --filter @crwsync/web lint
npx tsc --noEmit -p apps/frontend/web/tsconfig.json
pnpm --filter @crwsync/web build
```
Expected: all three succeed with no errors. `build` catches anything the per-task `tsc --noEmit` checks might have missed once every file is composed together (e.g. `next/image` config, unused-import lint rules across the whole page).

- [ ] **Step 2: Manual browser walkthrough**

With the local stack running (`pnpm dev` from repo root, plus `pnpm demo:seed` if the demo workspace isn't already seeded), open `http://localhost:3000` and check:

- Hero shows the new headline/copy, both CTAs, and the poster thumbnail.
- "Try Live Demo" signs in and redirects to the dashboard as the seeded `DEMO_OWNER` account.
- The poster thumbnail and "Watch the walkthrough" button both open the video modal; the video plays with sound; Escape, the backdrop, and the close button all dismiss it and stop playback.
- Proof strip, tightened Features copy, unchanged Architecture, new About section, and trimmed Contact all appear in the right order.
- Header nav (desktop and mobile) includes "About" and scrolls correctly.
- Footer shows only GitHub/LinkedIn/copyright — no dead markup left in the rendered DOM (view source or React DevTools).
- Toggle dark/light theme — glass surfaces, warm palette, and the One Ember Rule (only CTAs/active states are orange) hold in both.
- Toggle OS-level "reduce motion" — Architecture diagram loses its animation, everything else still functions.
- Resize to a mobile viewport — hero CTA row stacks, poster thumbnail scales, hamburger menu includes "About".

- [ ] **Step 3: Fix anything found, then this task is done**

No commit for this task by itself — any fixes found here get their own small commit against the relevant file from Tasks 1-10.

---

## Self-Review Notes

- **Spec coverage:** every section of the spec (Hero, Proof strip, Features, Architecture, About, Contact, Footer, demo CTA mechanics, video handling, accessibility) maps to a task above. Out-of-scope items from the spec (video compression, light-theme video, dashboard changes, new routes) are intentionally not tasked.
- **Placeholder scan:** no TBD/TODO; About the Builder content is grounded in existing repo text (footer name/links, contact.tsx's existing first-person copy, README's own project description) per the user's explicit choice to pull from README rather than invent new bio copy, and to skip a photo.
- **Type consistency:** `DemoVideoDialog` is `forwardRef<HTMLDialogElement>` in Task 3 and consumed as `<DemoVideoDialog ref={dialogRef} />` with `dialogRef = useRef<HTMLDialogElement>(null)` in Task 5 — matches. `TryDemoButton` takes no props in both Task 4 and its Task 5 usage. `usePrefersReducedMotion(): boolean` signature matches its two call sites in Task 2.

---
name: crwsync
description: A production-grade real-time collaborative workspace platform, expressed through a warm-glass interface.
colors:
  background: "oklch(1.00 0.007 64.35)"
  foreground: "oklch(0.16 0.020 64.35)"
  card: "oklch(0.98 0.008 64.35)"
  border: "oklch(0.87 0.015 64.35)"
  input: "oklch(0.97 0.010 64.35)"
  placeholder: "oklch(0.64 0.020 64.35)"
  ring: "oklch(0.78 0.190 36.91)"
  primary: "oklch(0.703 0.188 36.91)"
  primary-hover: "oklch(0.763 0.188 36.91)"
  primary-foreground: "oklch(1.000 0.000 0.000)"
  secondary: "oklch(0.966 0.003 49.76)"
  secondary-foreground: "oklch(0.210 0.006 49.76)"
  muted: "oklch(0.966 0.003 49.76)"
  muted-foreground: "oklch(0.492 0.016 49.76)"
  base-100: "oklch(0.940 0.0035 64.35)"
  base-200: "oklch(0.880 0.0035 64.35)"
  base-300: "oklch(0.820 0.0035 64.35)"
  destructive: "oklch(0.70 0.190 25.00)"
  info: "oklch(0.72 0.18 245)"
  success: "oklch(0.75 0.18 145)"
  warning: "oklch(0.84 0.18 75)"
  alert: "oklch(0.84 0.18 50)"
  error: "oklch(0.72 0.18 25)"
typography:
  display:
    fontFamily: "Figtree, system-ui, arial"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Figtree, system-ui, arial"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "Figtree, system-ui, arial"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Figtree, system-ui, arial"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "0.4rem"
  md: "0.525rem"
  lg: "0.65rem"
  xl: "0.85rem"
  2xl: "1rem"
  4xl: "2rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "3rem"
  2xl: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  pill-badge:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: crwsync

## Overview

**Creative North Star: "The Warm Control Room"**

crwsync's interface reads like a well-run mission-control desk for a small crew: calm, warm-toned glass panels float over a single neutral canvas, with one ember-orange accent reserved for the handful of things that actually need your attention — the primary action, the active state, the signal moving through the system. Nothing is stark or clinical; the palette leans warm (a whisper of orange hue bleeds into every neutral, background, and border) rather than the cold blue-gray of typical dashboard software. Depth comes from translucency and layering, not from heavy drop shadows — panels look like frosted glass stacked a few millimeters above the page, not blocks with shadows cast beneath them.

Density is moderate-to-generous: the public site breathes with large vertical rhythm (`py-24`, `py-12` sections), while the authenticated dashboard tightens up for information density without ever feeling cramped. Both surfaces share the exact same token set, component primitives, and glass language — a visitor moving from the marketing site into the product should feel zero discontinuity.

The system explicitly rejects: flat "material" cards with hard edges and drop shadows, cold neutral (blue-gray) base palettes, more than one accent hue competing for attention, and any second display typeface — Figtree alone carries the full weight range from light body copy to bold, extrabold headlines.

**Key Characteristics:**
- Warm, single-hue neutral system (background/border/muted all share the same ~64° warm hue in OKLCH)
- One accent color, ember orange, used sparingly and deliberately
- Glassmorphism as the primary depth cue: translucent gradients, backdrop blur, hairline borders
- Generous, consistent corner rounding — nothing in the system is sharp
- Motion-literate: Framer Motion for staggered reveals, blur-fades, and an animated data-flow diagram as a signature piece
- One typeface (Figtree) doing all the work across five weights

## Colors

The palette is intentionally narrow: one warm neutral scale, one accent, and a fixed feedback/label set for status and tagging. Every neutral token (background, card, border, muted) shares the same ~64.35° OKLCH hue so nothing reads as "gray" in the cold sense — it's a warm paper tone.

### Primary
- **Ember Orange** (`oklch(0.703 0.188 36.91)`): The single brand accent. Used only for primary CTAs ("Join the crew," "Get Started"), active/focus states, the logo mark, and the animated signal beam in the architecture diagram. Never used as a background fill for large surfaces.
- **Ember Orange, Hover** (`oklch(0.763 0.188 36.91)`): Lightened hover state for the same accent — buttons brighten on hover rather than darken, reinforcing warmth.

### Secondary
- **Warm Parchment** (`oklch(0.966 0.003 49.76)`): Near-neutral warm off-white, used for secondary button fills and muted surface backgrounds. Its foreground pairing, **Ink Charcoal** (`oklch(0.210 0.006 49.76)`), is near-black with a faint warm cast.

### Neutral
- **Warm White** (`oklch(1.00 0.007 64.35)`): Page background (light mode).
- **Warm Charcoal** (`oklch(0.16 0.020 64.35)`): Page foreground / body text (light mode); this same value becomes the *background* of the footer band, giving the footer a deliberately inverted, always-dark anchor at the base of the public site regardless of theme.
- **Paper Card** (`oklch(0.98 0.008 64.35)`): Card and popover surfaces, barely lifted off the page background.
- **Hairline Border** (`oklch(0.87 0.015 64.35)`): Structural borders on non-glass surfaces (inputs, dividers).
- **Muted Ink** (`oklch(0.492 0.016 49.76)`): Secondary text — descriptions, captions, nav links at rest.
- **Base Shade 100/200/300** (`oklch(0.940 / 0.880 / 0.820 0.0035 64.35)`): A tight three-step tonal ramp for stacked flat surfaces (e.g. sidebar layers in the dashboard) where glass treatment isn't used.

### Feedback & Tags
A fixed hue rotation carries all status and categorization color, kept separate from the brand accent so status never gets confused with "the button color":
- **Info** (`oklch(0.72 0.18 245)`) · **Success** (`oklch(0.75 0.18 145)`) · **Warning** (`oklch(0.84 0.18 75)`) · **Alert** (`oklch(0.84 0.18 50)`) · **Error / Destructive** (`oklch(0.70–0.72 0.19 25)`)
- An 8-hue **label palette** (red, orange, yellow, green, teal, blue, purple, pink, all at matched lightness/chroma) exists specifically for user-assigned tags (e.g. Kanban card labels) — never reused for UI chrome.

### Named Rules
**The One Ember Rule.** Ember Orange appears on no more than a small handful of elements per screen: the primary CTA, the active nav/tab indicator, the logo, and directional motion (the signal beam). If a screen has more than one or two orange elements outside of user-generated tag colors, that's a violation — reach for the neutral or secondary token instead.

**The Warm-Only Rule.** Never introduce a cold gray. Every neutral — background, border, card, muted, base-100/200/300 — carries the same warm OKLCH hue family (~49–64°). A neutral pulled from a cold palette (blue-gray, pure gray) breaks the system immediately and visibly.

## Typography

**Display / Body / Label Font:** Figtree (Google Font), with `system-ui, arial` fallback. Loaded once at weights 300/400/500/600/800 with `font-display: swap`.

**Character:** A single humanist geometric sans doing every job in the system — friendly and rounded enough to feel approachable for a team-collaboration product, but with enough weight range (300 → 800) to carry serious hierarchy without ever switching families. Tight, slightly negative letter-spacing on large text keeps headlines feeling confident rather than loose.

### Hierarchy
- **Display** (700–800, `clamp(2.25rem, 5vw, 3.75rem)`, line-height ~1.05, tracking tight): Hero headline only. Reserve extrabold (800) for the single largest headline on a page; everything else uses bold (700).
- **Headline** (700, `text-4xl` / 2.25rem, line-height 1.1): Section titles ("Runtime Architecture," "CI/CD Pipeline").
- **Title** (600, `text-xl`, line-height snug): Card and component titles (feature card names).
- **Body** (500, `text-sm` → `text-[1.1rem]` responsive, line-height tight→normal, max ~65ch): Paragraph copy, descriptions. Medium weight is the default body weight — regular (400) is rarely used on this project; copy should feel deliberate, not thin.
- **Label** (600, `text-xs`–`text-sm`, tracking wide): Eyebrow pills ("Features," "Architecture"), nav items, button labels, form labels. Small caption text in diagrams drops to `text-[10px]`.

### Named Rules
**The One Voice Rule.** No second font family, ever — including for code/mono contexts. Hierarchy is built entirely from Figtree's weight range and size scale, not from mixing typefaces.

## Layout

Both apps share one spatial grammar built on Tailwind's default 4px-based scale, but at different densities:

- **Public portal (`apps/frontend/web`):** Wide, breathing sections. Horizontal padding `px-6` mobile → `sm:px-12` desktop; vertical section rhythm alternates `py-12` and `py-24`. Content is capped per-section (`max-w-4xl` for hero copy, `max-w-6xl` for the feature bento grid, `max-w-7xl` for the architecture diagram) and centered.
- **Dashboard (`apps/frontend/dash`):** Denser, app-shell layout — fixed left sidebar (collapsible, drag-and-drop reorderable modules), main content area, optional right sidebar/panel. Spacing tightens to `gap-2`–`gap-4` inside working surfaces; the generous public-site rhythm does not carry into authenticated screens.
- **Responsive breakpoints:** Tailwind defaults (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). The public header and navigation collapse to a hamburger + slide-down menu below `lg`; the architecture diagram reflows from a horizontal flow (desktop) to a stacked vertical flow (mobile).
- **Floating chrome:** The public header is a fixed, inset (`m-4`), floating glass bar rather than an edge-to-edge bar — reinforcing the "panel floating over canvas" language everywhere else in the system.

## Elevation & Depth

crwsync is **flat-by-default with translucent layering**, not shadow-driven. Depth is communicated primarily by stacking semi-transparent, blurred glass panels over a solid base canvas, with only a soft, low-opacity ambient shadow (`shadow-md`/`shadow-xl` at ~5% black opacity) reinforcing the edge — never a hard, high-contrast drop shadow.

### Shadow Vocabulary
- **Ambient Glass Shadow** (`box-shadow` via Tailwind `shadow-md shadow-black/5` or `shadow-xl/5`): The only shadow role in the system. Used under every glass panel (header, cards, glassbox forms, architecture nodes) to lift it a few millimeters off the canvas — never to imply a large elevation gap.
- **Beam Glow** (`filter: drop-shadow(0 0 8px var(--primary))`): A special-case glow, not a structural shadow — used exclusively on the animated signal beam in the architecture diagram to make the accent color feel like light moving through the system.

### Named Rules
**The Glass-Not-Card Rule.** When a surface needs to sit "above" the page, reach for a translucent gradient (`bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5`) + hairline border (`border-[1.5px] border-foreground/10`) + backdrop blur before reaching for a solid card with a shadow. Solid `bg-card` surfaces are reserved for content-dense, non-decorative contexts (forms, popovers, dialogs) where legibility beats atmosphere.

## Shapes

Corners are generous and consistent — nothing in the system is sharp. The radius scale is CSS-variable driven (`--radius: 0.65rem` as the base "lg"), with static Tailwind extras layered on top for larger decorative containers:

- `rounded-md` / `rounded-lg` (~0.53–0.65rem): form controls, buttons, standard interactive elements.
- `rounded-xl` (~0.85rem): feature/bento cards.
- `rounded-2xl` (1rem): glass panels, auth-form containers (`GlassBox`).
- `rounded-4xl` (2rem): large grouping containers (the dashed-border "Clients / Infrastructure / Frontend / Data" groupings in the architecture diagram).
- `rounded-full`: pills, avatars, icon buttons, the animated ripple rings behind the hero.

Borders are thin and soft rather than structural: `border-[1.5px]` at low foreground opacity (`/10`–`/20`) is the standard weight for glass-panel edges; solid, full-opacity borders are reserved for non-glass form inputs and dividers. Dashed borders (`border-dashed`) are a deliberate secondary vocabulary reserved for diagrammatic grouping, never for ordinary UI containers.

## Components

### Buttons
- **Shape:** `rounded-lg` (0.65rem) as the default; `rounded-md` for compact/small sizes.
- **Primary:** Solid Ember Orange fill, white text, semibold. Layered with a subtle top-down gradient overlay (`bg-linear-to-t from-foreground/15 to-transparent`, brightening `to-foreground/30` on hover) rather than a flat color swap — hover reads as "catching more light," not "changing color."
- **Secondary:** Warm Parchment fill with Ink Charcoal text.
- **Outline:** Transparent background, muted-foreground text and border, both shifting to full foreground on hover.
- **Ghost / Link:** No fill; text-only with an accent underline (link) or background tint on hover (ghost).
- **Focus:** `focus-visible:ring-3 ring-primary/50` plus a border color shift to primary — always visible, never suppressed.

### Cards (Bento / Feature)
- **Corner Style:** `rounded-xl`.
- **Background:** Glass gradient (`from-foreground/10 via-foreground/6 to-foreground/5`) over a faint dot-grid texture, masked to a soft radial fade.
- **Border:** `border-[1.5px] border-foreground/10`.
- **Shadow:** Ambient Glass Shadow only.
- **Behavior:** Bento cards in a column grow (`flex-2`) on hover/group-hover and reveal their icon illustration at full opacity — a deliberate "this one has focus" affordance rather than a static grid.

### Glass Panels (`GlassBox`)
- **Style:** `rounded-2xl`, stronger blur (`backdrop-blur-md`) than cards, used to frame auth forms (sign in/up, password reset) so they read as a distinct floating surface over the page.

### Pills / Eyebrow Badges
- **Style:** `rounded-full`, glass background, `text-sm` muted-foreground label, uppercase-adjacent tracking-wide. Used exactly once per section as a small category label ("Features," "Architecture") above a headline — never as a persistent UI chrome element.

### Inputs / Fields
- **Style:** Solid `bg-input` fill (not glass — legibility over atmosphere), `border` token, standard control rounding.
- **Focus:** Border shifts to `ring` (primary-tinted) with a soft outer ring, matching the button focus treatment for consistency.

### Navigation (Public Header)
- **Style:** Fixed, floating glass bar inset from the viewport edge (`m-4`), backdrop blur intensifying when the mobile menu is open. Logo swaps between full wordmark (desktop) and icon-only mark (mobile) rather than shrinking the same asset.
- **States:** Nav links are muted-foreground at rest, full foreground on hover, with `transition-colors`. Mobile menu items reveal with a staggered, blurred fade-in (Framer Motion `filter: blur(8px) → blur(0px)`), not a simple slide or fade.

### Signature Component: Animated Architecture Diagram
A bespoke, hand-built system diagram (not a library) that renders infrastructure nodes as glass cards connected by SVG paths, with an animated "signal beam" (a glowing Ember Orange stroke with `pathOffset` animation) traveling along each connector to visualize request/data flow, plus marching-ants dashed lines for asynchronous/WebSocket paths. This is the system's most distinctive piece and directly embodies the "production-grade architecture" positioning — future signature visualizations (data flow, real-time sync, pipeline states) should extend this same visual grammar rather than introducing a new diagram style.

## Do's and Don'ts

### Do:
- **Do** keep Ember Orange rare — CTA, active state, brand mark, signal/motion only (**The One Ember Rule**).
- **Do** build every neutral from the same warm OKLCH hue family; never mix in a cold gray (**The Warm-Only Rule**).
- **Do** reach for translucent glass + hairline border + blur before a solid card + shadow (**The Glass-Not-Card Rule**).
- **Do** keep every corner rounded — pick from the established radius scale (`md`/`lg`/`xl`/`2xl`/`4xl`/`full`) rather than inventing a new value.
- **Do** use Framer Motion's blur-fade / stagger pattern for reveals and menus, consistent with the existing header and architecture diagram.
- **Do** preserve OKLCH as the token format for any new color; never introduce a hex-defined color alongside the OKLCH system.

### Don't:
- **Don't** introduce a second typeface. Figtree's weight range (300–800) is the entire hierarchy toolkit.
- **Don't** use a hard, high-contrast `box-shadow` anywhere outside dialogs/popovers — the system reads depth through translucency, not shadow.
- **Don't** ship a sharp (non-rounded) corner on any user-facing container, button, input, or card.
- **Don't** apply the 8-hue label/tag palette to UI chrome — it exists solely for user-assigned content (tags, labels) and must stay visually distinct from system status colors.
- **Don't** let dashed borders leak into ordinary containers — they're reserved for diagrammatic/grouping contexts.

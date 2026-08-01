# crwsync demo — SHOTLIST

Source audio: `apps/demo/crwsync-voiceover.mp3`
Word-level transcript: `apps/demo/voiceover.words.json` (183 words, generated below)
Original script: `apps/demo/crwsync-script.md` — **superseded**, see "Script vs. recorded VO"

## Timing base

| | |
|---|---|
| Measured duration | **85.943 s** (`ffprobe`) |
| Last spoken word ends | 85.460 s ("crew") |
| **`durationInFrames`** | **2578** @ 30 fps, 1920×1080 |
| Outro tail | frames 2539–2578 (13 f / 0.48 s of silence after the last word) — **padded, not trimmed** |

**Boundaries are now derived from word-level timestamps**, not silence heuristics.
Transcribed locally with `faster-whisper small.en`, `word_timestamps=True`, `vad_filter=False`, `beam_size=5`.
Every cut sits at the midpoint of the gap between the last word of one beat and the first word of the next.

### Cut-frame diff vs. the silence-inferred version

| Cut | Boundary words | Gap | Cut at | Frame | Prev | **Δ** |
|---|---|---|---|---|---|---|
| B1\|B2 | `workspace.` → `Signing` | 8.660 – 9.780 | 9.220 s | **277** | 276 | +1 |
| B2\|B3 | `dashboard.` → `Set` | 15.740 – 16.700 | 16.220 s | **487** | 489 | −2 |
| B3\|B4 | `team.` → `Explore` | 22.740 – 23.920 | 23.330 s | **700** | 699 | +1 |
| B4\|B5 | `moments.` → `Get` | 32.200 – 33.260 | 32.730 s | **982** | 982 | 0 |
| B5\|B6 | `work.` → `Create` | 41.180 – 42.060 | 41.620 s | **1249** | 1250 | −1 |
| B6\|B7 | `moves.` → `Chat` | 51.860 – 52.960 | 52.410 s | **1572** | 1653 | **−81** |
| B7\|B8 | `work.` → `Group` | 63.680 – 64.740 | 64.210 s | **1926** | 2120 | **−194** |
| B8\|B9 | `team.` → `Back` | 73.580 – 74.220 | 73.900 s | **2217** | 2395 | **−178** |
| end | — | — | 85.943 s | **2578** | 2578 | 0 |

The five boundaries I could corroborate against surviving script text moved by ≤2 frames.
The three I had to infer — every boundary in the back half — were wrong by **81, 194 and 178 frames**
(2.7 s, 6.5 s, 5.9 s). Beat 9 was under-budgeted by half: it is **361 frames, not 183**.

### Resulting beat lengths

| Beat | Frames | Length | Was |
|---|---|---|---|
| B1 Landing | `0 – 277` | 277 f / 9.23 s | 276 f |
| B2 Auth | `277 – 487` | 210 f / 7.00 s | 213 f |
| B3 Workspace | `487 – 700` | 213 f / 7.10 s | 210 f |
| B4 Invites | `700 – 982` | 282 f / 9.40 s | 283 f |
| B5 Statistics | `982 – 1249` | 267 f / 8.90 s | 268 f |
| B6 Board | `1249 – 1572` | 323 f / 10.77 s | 403 f |
| B7 Chat | `1572 – 1926` | 354 f / 11.80 s | 467 f |
| B8 Projects | `1926 – 2217` | 291 f / 9.70 s | 275 f |
| B9 Home + outro | `2217 – 2578` | 361 f / 12.03 s | 183 f |

---

## Beats

Narration below is **verbatim from the audio**. Sub-beat frames are word-accurate — use them to land each
interaction on its word.

### B1 · Landing — `0 – 277`

> *"Your team's work is scattered across tons of different tools. CrewSync pulls chat, tasks, and schedules into one real-time workspace."*

**App:** web `:3000`, **unauthenticated context** (no `storageState`).

| Frames | Word cue | Action |
|---|---|---|
| 0 – 93 | "Your team's work is scattered across tons of different tools." (0.00–3.12) | Route `/`. Hold on H1 `Work in sync.` + `<span class="text-primary">Not in silos.</span>` (`web/components/home/hero.tsx:10`). |
| 93 – 123 | gap (3.12–4.12) | Begin eased scroll of `<main>`. |
| 123 – 260 | "CrewSync pulls chat, tasks, and schedules…" (4.12–8.66) | Scroll through `#features` bento grid — Kanban Task Boards / Collaborative Workspaces / Real-Time Chat & Messaging / Project Scheduling / Notifications. |
| 260 – 277 | tail | Ease back to top, header CTA `a[href="/auth/signup"]` "Join the crew" in frame. |

### B2 · Auth — `277 – 487`

> *"Signing in takes seconds. One secure session carries you straight from the site into your dashboard."*

**App:** web → dash. Same unauthenticated context; this beat *creates* the session.

| Frames | Word cue | Action |
|---|---|---|
| 277 – 293 | — | Click header `a[href="/auth/signin"]` (`web/components/home/header.tsx:71`) → `/auth/signin`. |
| 293 – 334 | "Signing in takes seconds." (9.78–11.12) | Type `#identifier`, then `#password` (`web/components/signin-form.tsx:90,102`). Tick `#remember` (line 115). |
| 359 – 400 | "One secure session…" (11.98–…) | Click `button[type=submit]` "Sign In" (line 133). |
| 400 – 472 | "…straight from the site into your dashboard." (…–15.74) | Cross-origin redirect to `NEXT_PUBLIC_DASH_URL` (`:3001`). 8 f dissolve over the origin change. |
| 472 – 487 | tail | Dashboard settles. |

### B3 · Workspace creation — `487 – 700`

> *"Set up a workspace instantly. Give it a name, and your environment is ready for the entire team."*

**App:** dash `/create-workspace` — **a full route, not a modal** (the old script row said "pop up modal").

| Frames | Word cue | Action |
|---|---|---|
| 487 – 546 | "Set up a workspace instantly." (16.70–18.22) | Land on `/create-workspace`. Centred glassbox card on the ripple/dot-pattern background, heading "Create Workspace". |
| 569 – 640 | "Give it a name…" (18.98–…) | Type `#ws-name` → `Northstar Labs` (placeholder `Acme Inc.`), then `#ws-slug` → `northstar` (placeholder `acme`). The VO never mentions the slug — keep that keystroke quick. |
| 640 – 682 | "…ready for the entire team." (…–22.74) | Click `Create Workspace` → lands on `/northstar`. |
| 682 – 700 | tail | Dashboard shell paints. |

### B4 · Sidebar tour + invite — `700 – 982`

> *"Explore your workspace structure. Invite teammates by email. Assign their roles and get everyone collaborating in moments."*

**App:** dash. **The VO names roles explicitly — the role `Select` must be on screen.** See Blocker 3.

| Frames | Word cue | Action |
|---|---|---|
| 718 – 768 | "Explore your workspace structure." (23.92–25.60) | Cursor pan down `LSidebar`: workspace switcher chevron (popover — `Workspaces` list + `Create Workspace`), `Search…` w/ `⌘K` chip, `Home ⌘1`, `Statistics ⌘2`, divider, `Shared` + `＋`, `Projects` + `＋`, profile pill → chevron → `Online` / `Settings` / `Sign Out`. Close popover. |
| 792 – 840 | "Invite teammates by email." (26.40–28.00) | `RSidebar` → click `Invite Members` → `InviteMemberModal` "Invite people to Northstar Labs". Type the second seeded user's email into `Enter username or email`. |
| 840 – 966 | "Assign their roles and get everyone collaborating in moments." (28.00–32.20) | Result row appears → open the role `Select` → `Admin / Member / Guest` (`dash/components/inv-modal.tsx:277–279`) → pick `Member` → `Send Invite`. Tail: toggle the pending-invites icon (modal top-right) to show the invite listed. |
| 966 – 982 | tail | Close modal. |

### B5 · Statistics — `982 – 1249`

> *"Get instant visibility with global statistics. Track active workload, velocity, and cycle times as your team completes work."*

**App:** dash `/{slug}/statistics`. Every StatCard is named in the VO — sync the highlights to the words.

| Frames | Word cue | Action |
|---|---|---|
| 982 – 998 | — | Press `ctrl+2` → `/northstar/statistics`. |
| 998 – 1075 | "Get instant visibility with global statistics." (33.26–35.84) | Land on `1M`. Let the framer-motion staggered blur-in play across the three StatCards and the `Workspace Velocity` chart. |
| 1102 – 1133 | "Track active workload," (36.74–37.76) | Highlight / cursor-rest the **Active Workload** card. |
| 1146 – 1157 | "velocity," (38.20–38.58) | **Velocity** card. |
| 1169 – 1235 | "and cycle times as your team completes work." (38.96–41.18) | **Avg. Cycle Time** card, then click `3M` on the `1W/2W/1M/3M/6M/1Y` toggle to replay the area-chart transition. |
| 1235 – 1249 | tail | Chart settles. |

### B6 · Task board — `1249 – 1572` · **re-blocked, 6 interactions**

> *"Create dedicated task boards for your workflows. Define custom columns, set priorities, assign deadlines, and track every item as it moves."*

**App:** dash `/{slug}/board/{boardId}`. Board `Sprint 14` is **pre-seeded with its columns and tasks** — the take opens on an already-populated board. `AddModuleModal` and `+ Add Column` are both cut.

| # | Frames | Word cue | Interaction |
|---|---|---|---|
| 1 | 1249 – 1262 | — | Click `Sprint 14` in the sidebar. Board paints already full. |
| — | 1262 – 1343 | "Create dedicated task boards for your workflows." (42.06–44.76) | **No interaction.** Wide hold on the whole board — 4 columns, populated. This phrase is carried by the seeded state, not by a create flow. |
| 2 | 1364 – 1404 | "Define custom columns," (45.48–46.80) | Open the `⋯` menu on the `In Review` column → rename field, colour swatches, column type incl. `COMPLETE` → close. Shows custom columns without creating one. |
| 3 | 1418 – 1441 | "set priorities," (47.26–48.04) | Click a seeded card → `TaskDetailModal` opens → click `Urgent` on the Priority row. |
| 4 | 1457 – 1484 | "assign deadlines," (48.58–49.48) | Open the Deadline date-picker, pick a date, click `Save` (modal closes). |
| 5 | 1498 – 1556 | "and track every item as it moves." (49.94–51.86) | dnd-kit drag: a card from `In Progress` → `Done`. |
| 6 | 1556 – 1572 | tail | Board settles; the `Done` count increments. |

Six interactions, five of them ≤1.3 s. Interaction 2 is the risk — if the `⋯` menu open/close reads as
rushed at 40 frames, drop it and hold the wide shot through "Define custom columns" instead, relying on
the seeded column names (`Backlog / In Progress / In Review / Done`) to carry the line. That falls to
5 interactions.

### B7 · Chat — `1572 – 1926`

> *"Chat rooms live in the same sidebar. Messages, reactions, mentions, and typing indicators all stream live. So conversation stays right next to the work."*

**App:** dash `/{slug}/chat/{roomId}`. **Two authenticated Playwright contexts driven in parallel** — the
socket layer is the point of this beat. Room `design-sync` is pre-seeded with a short history so the list
is not empty on entry.

| Frames | Word cue | Action |
|---|---|---|
| 1572 – 1589 | — | Click `design-sync` in the sidebar. |
| 1589 – 1637 | "Chat rooms live in the same sidebar." (52.96–54.56) | Room opens with seeded history. Sidebar stays in frame — the room is a sibling of the board, not a separate app. |
| 1661 – 1675 | "Messages," (55.36–55.84) | **Context B** sends a message → it lands in **Context A**'s `MessageList` live, no reload. |
| 1688 – 1702 | "reactions," (56.28–56.74) | Context A hovers B's bubble → `EmojiPicker` → react. `ReactionIndicator` increments in both contexts. |
| 1719 – 1727 | "mentions," (57.30–57.56) | Context A types an `@` mention of user B. |
| 1739 – 1810 | "and typing indicators all stream live." (57.98–60.32) | Context B starts typing → `TypingIndicator` renders in Context A. Hold on it. |
| 1834 – 1910 | "So conversation stays right next to the work." (61.12–63.68) | Pull back to the full shell: sidebar + chat, then cursor rests on `Sprint 14` in the same sidebar. |
| 1910 – 1926 | tail | Settle. |

**Cut from the old plan:** read receipts and the unread badge. The recorded VO says neither
(the corrupt script did). Do not stage shots for them.

### B8 · Projects — `1926 – 2217`

> *"Group your work logically. Create a project, then drag your board and chat room inside. Everything reorders instantly for the whole team."*

**App:** dash. New opening sub-beat — the old script had no "Group your work logically."

| Frames | Word cue | Action |
|---|---|---|
| 1942 – 1979 | "Group your work logically." (64.74–65.98) | Sidebar in focus, `Shared` section holding `Sprint 14` + `design-sync` flat. |
| 1999 – 2029 | "Create a project," (66.64–67.64) | `SectionHeader label="Projects"` → click the `Add01Icon` `＋` (`dash/components/sidebar/SectionHeader.tsx:26`) → `useCreateProject` inserts `New Project` in inline-rename → type `Q3 Launch`, Enter. |
| 2042 – 2105 | "then drag your board and chat room inside." (68.06–70.18) | Two dnd-kit drags from `SidebarDroppable id="shared"` into the `SidebarProject` droppable: `Sprint 14`, then `design-sync`. ~30 f each. |
| 2129 – 2207 | "Everything reorders instantly for the whole team." (70.96–73.58) | Both modules nested under `Q3 Launch`; `useReorderModules` persists. Optional: the second context's sidebar reorders too — strongest possible reading of "for the whole team". |
| 2207 – 2217 | tail | Settle. |

### B9 · Home + outro — `2217 – 2578`

> *"Back on your home dashboard, view pinned modules and live metrics all in one place. Tasks, chat, and analytics in sync. CrewSync — join the crew."*

**App:** dash `/{slug}` → Remotion composite. **Now 361 frames — double the previous budget.**

| Frames | Word cue | Action |
|---|---|---|
| 2217 – 2227 | — | Press `ctrl+1` → `/northstar`. |
| 2227 – 2267 | "Back on your home dashboard," (74.22–75.58) | Greeting `Good {timeOfDay}, {firstName}` + `Today is {date}`. |
| 2288 – 2381 | "view pinned modules and live metrics all in one place." (76.26–79.38) | `Quick Stats` counts up to **non-zero** (Total / Completed / In Progress), then the `Pinned Modules` grid renders `Sprint 14` + `design-sync` cards with their Board / Chat sub-labels. |
| 2411 – 2477 | "Tasks, chat, and analytics in sync." (80.38–82.56) | Three quick beats — cut or push-in to board, chat, statistics. 22 f each. This is the montage the old 183-frame budget had no room for. |
| 2477 – 2543 | "CrewSync —" (82.56–83.98) | Crossfade out of app footage into the Remotion composite: `apps/frontend/web/public/logo@orange.svg` on `#0a0a0a`. |
| 2543 – 2564 | "join the crew." (84.78–85.46) | CTA lockup. |
| 2564 – 2578 | silence | Hold, fade. **Pad — do not trim.** |

---

## Script vs. recorded VO

`crwsync-script.md` is not what was recorded. Differences that change the shots:

| Beat | Script said | Audio says | Effect |
|---|---|---|---|
| B1 | "scattered across **five** tools" | "scattered across **tons of different** tools" | Cosmetic — but don't put a five-logo graphic on screen. |
| B4 | invite by email | "Invite teammates by email. **Assign their roles**" | Role `Select` is now mandatory on camera. |
| B6 | "Name your columns", Add Column | "**Define** custom columns" | Satisfiable with seeded columns + the `⋯` menu. No create flow needed. |
| B7 | "…**read receipts** all stream over the **same socket the boards use**" | "…and **typing indicators** all stream live" | Read receipts and unread badge cut from the beat. |
| B8 | starts at "Create a project" | starts at "**Group your work logically.**" | New 37-frame opening sub-beat. |
| B9 | "pinned modules, live stats, one screen" | "…all in one place. Tasks, chat, and analytics in sync." | Beat is 2× longer; there is now room for a three-shot montage before the logo. |

Treat `voiceover.words.json` as the source of truth for narration. The `.md` script is reference only.

---

## Capture rig

Playwright, added as a dev dependency, driving a script — not an MCP.

* `viewport: { width: 1920, height: 1080 }` sets the CSS viewport exactly, headed included. No CDP override.
* **Unauthenticated context** for B1–B3 (no `storageState`) — `web/proxy.ts` bounces every route to the dash
  whenever the `crw-rt` cookie exists, so the landing and signin pages only exist in a cookieless context.
  B2 ends by creating the session; persist it with `storageState()` for the rest.
* **Two authenticated contexts** for B7 (owner + member), driven in parallel in the same script.
  B8's optional closing shot reuses context B.
* **Production build**: `pnpm build && pnpm start` for web (`:3000`) and dash (`:3001`). Kills the Next.js dev
  overlay, which in dev sits bottom-right directly on top of `Invite Members` and swallowed the click during
  the walkthrough (it was also showing a red "1 Issue" badge).
* Capture per-beat clips, not one long take — the beat table is the cut list.

## Environment verified this session

Ports already live: `:3000` web, `:3001` dash, `:8080` API, `:5432` postgres, `:6379` redis. Docker Desktop is
**not** running — postgres and redis are native, `docker-compose.dev.yml` is not what is serving.
`ACCESS_COOKIE_DOMAIN` / `REFRESH_COOKIE_DOMAIN` are ignored in dev (`auth.cookie.ts:4`), so the localhost
session is shared across all three ports.

**I sent one message into `DemoChat`** during the walkthrough ("Board is live, moving MCR-4 to review") to
verify the socket path. That workspace (`microsoft`/`mcrsft`) is untouched by the seed — the fixture is
scoped to slug `northstar` and the three demo accounts, so your own data stays put. Delete that message by
hand if you keep the workspace.

---

## Demo fixture

    cp .env.demo.example .env.demo     # fill in the three passwords
    pnpm demo:seed

`apps/backend/prisma/seed.demo.mjs`. Idempotent — drops the demo workspace and the demo users, then rebuilds.
Never truncates a table, never touches rows outside the fixture. Refuses to run unless `DATABASE_URL` resolves
to a local host, and refuses under `NODE_ENV=production`. Invalidates only the Redis keys whose names survive
a reseed (`workspace:slug:northstar`, `user:identifier:*`, `verification:*`), by exact name — no pattern scan,
no `FLUSHDB`.

**Every date is computed from the run timestamp**, so the fixture never ages out.

| | |
|---|---|
| Workspace | `Northstar Labs` / `northstar`, key `NL` (matches `generateWorkspaceKey`) |
| Board | `Sprint 14` — `Backlog` UPCOMING · `In Progress` ONGOING · `In Review` UPCOMING · `Done` COMPLETE |
| Chat room | `design-sync`, 6 messages over the last 2 days, one historical reaction |
| Modules | both in **Shared**, no project — B8 creates `Q3 Launch` on camera |
| Pins | both modules pinned for the owner → B9's Pinned Modules grid |
| Tasks | 51: Backlog 6 · In Progress 5 · In Review 3 · Done 37 (6 visible, 31 archived) |

`getBoard` filters `is_archived`, the statistics queries do not — so the archived completions feed the chart
and the StatCards at full history while the Done column stays readable at 6 cards.

**The velocity curve is shaped, not flat.** `COMPLETIONS_BY_DAY` builds to a peak around day 5 and eases off,
because a uniform 1-per-day series draws as a straight line and B5 is built around that chart. Cycle times
shorten toward the present, so Avg. Cycle Time reads as a plausible improving number.

Verified against the **live API** as `mara`, not just against the seed's own SQL:

    workload 5   velocity 14   cycle 41.9h
    07-04:1 07-06:1 07-08:1 07-10:1 07-12:1 07-14:2 07-16:1 07-18:1 07-20:2 07-21:1
    07-22:2 07-23:1 07-24:2 07-25:2 07-26:1 07-27:3 07-28:2 07-29:2 07-30:2 07-31:1

The script re-runs the real `getStatistics` queries after seeding and asserts each panel the video shows is
non-empty — 1M and 3M statistics, the 2w Quick Stats window, four non-empty board columns, an In Progress card
with no deadline for B6 to edit, chat history present, newest message un-reacted, 2 shared modules, 0 projects,
2 pins. It exits non-zero if any check fails.

### Three accounts, not two

`searchByEmailOrUsername` excludes **both existing members and pending invitees** when a `workspaceId` is
passed (`user.service.ts:73–80`). So the person invited on camera in B4 cannot be the same person who holds
the second chat context in B7 — an existing member is invisible in the invite modal.

| Account | Role | Used by |
|---|---|---|
| `DEMO_OWNER_*` | workspace OWNER | the recording context, every beat |
| `DEMO_MEMBER_*` | workspace MEMBER | B7's second parallel context; B8's optional closing shot |
| `DEMO_INVITEE_*` | **not a member** | B4 — the user searched for and invited on camera |

The seed asserts both halves of this: the invitee is searchable, the member is correctly hidden.

`.env.demo` is gitignored (`.env.*`); `.env.demo.example` is committed via a `!` exception.

---

## Remaining blockers

**1 · B6 interaction 2 may not fit.** 40 frames for open + read + close on the column `⋯` menu. Fallback
documented in the beat table (hold the wide shot, 5 interactions).

**2 · Transcription is machine-generated.** `faster-whisper small.en`. Word timings are frame-accurate for
cutting; the two brand renderings ("CrewSync", "Crew sync") are the model's, not necessarily what was spoken.
Nothing downstream depends on the spelling — but if you want on-screen captions, proofread
`voiceover.words.json` first.

**3 · Not yet seen rendered.** The fixture is verified through the API, not through the UI — checking it on
screen would have required signing out of your live browser session. First run of the Playwright capture
script will be the first look at the seeded dashboard.

*Resolved: empty Statistics/Quick Stats, off-brand data, single user in the database.*

---

## Next

Playwright capture script — `viewport: 1920×1080`, one unauthenticated context for B1–B3, two authenticated
contexts for B7, against a production build of web and dash. Per-beat clips cut to the frame table above.

┌──────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┐
│         Area         │                                   Reality in code                                    │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ app/page.tsx → Header, Hero, Features, Architecture, Contact, Footer. H1: "Work in   │
│ Landing              │ sync. Not in silos." CTA Join the crew → /auth/signup. Bento features: Kanban Task   │
│ (apps/frontend/web)  │ Boards, Collaborative Workspaces, Real-Time Chat & Messaging, Project Scheduling,    │
│                      │ Notifications                                                                        │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /auth/signin — fields #identifier ("Username or Email"), #password, #remember        │
│ Auth                 │ checkbox, "Forgot password?", button Sign In. Success → redirects to                 │
│                      │ NEXT_PUBLIC_DASH_URL                                                                 │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Workspace create     │ /create-workspace → CreateWorkspaceForm: #ws-name (placeholder "Acme Inc."),         │
│                      │ #ws-slug ("acme"), button Create Workspace                                           │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ LSidebar: workspace switcher, search (ctrl+K), global modules Home (ctrl+1) and      │
│ Sidebar (left)       │ Statistics (ctrl+2), divider, Shared section, Projects section, profile w/ status    │
│                      │ (online/busy/away/offline)                                                           │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Sidebar (right)      │ RSidebar: members list, invites, mentions/notifications, InviteMemberModal           │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Invite               │ InviteMemberModal — "Invite people to {workspace}", search "Enter username or        │
│                      │ email", role select Admin/Member/Guest, Send Invite, pending-invites toggle          │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /{slug}/statistics — interval toggle 1W/2W/1M/3M/6M/1Y, StatCards Active Workload,   │
│ Statistics           │ Velocity, Avg. Cycle Time, Recharts area chart "Workspace Velocity" (framer-motion   │
│                      │ staggered blur-in)                                                                   │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Add module           │ AddModuleModal: step 1 cards Task Board ("Track tasks and progress") / Chat Room     │
│                      │ ("Communicate with your crew"); step 2 name input, Create Module                     │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /{slug}/board/{boardId} — Add Column, dnd-kit columns (rename, color, type incl.     │
│ Board                │ COMPLETE), TaskDetailModal: title, rich description, priority NONE→URGENT, deadline, │
│                      │  labels, assignee search. Live via useBoardSocket                                    │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Chat                 │ /{slug}/chat/{roomId} — MessageList, ChatInput, reactions, emoji picker, link        │
│                      │ previews, typing indicator, read receipts, unread badges via chat:unread_increment   │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Projects             │ useCreateProject → "New Project" inline rename; useModuleDnd moves modules between   │
│                      │ Shared droppable and project droppables, persisted by useReorderModules              │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Home                 │ /{slug} — greeting + date, Quick Stats (Total Tasks / Completed / In Progress, 2w    │
│                      │ window), Pinned Modules grid (pin toggled from sidebar module)                       │
└──────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┘

⚠️ One correction to the brief: pinning does not pin to the sidebar — isPinned surfaces the module on the Home 
┌──────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┐
│         Area         │                                   Reality in code                                    │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ app/page.tsx → Header, Hero, Features, Architecture, Contact, Footer. H1: "Work in   │
│ Landing              │ sync. Not in silos." CTA Join the crew → /auth/signup. Bento features: Kanban Task   │
│ (apps/frontend/web)  │ Boards, Collaborative Workspaces, Real-Time Chat & Messaging, Project Scheduling,    │
│                      │ Notifications                                                                        │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /auth/signin — fields #identifier ("Username or Email"), #password, #remember        │
│ Auth                 │ checkbox, "Forgot password?", button Sign In. Success → redirects to                 │
│                      │ NEXT_PUBLIC_DASH_URL                                                                 │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Workspace create     │ /create-workspace → CreateWorkspaceForm: #ws-name (placeholder "Acme Inc."),         │
│                      │ #ws-slug ("acme"), button Create Workspace                                           │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ LSidebar: workspace switcher, search (ctrl+K), global modules Home (ctrl+1) and      │
│ Sidebar (left)       │ Statistics (ctrl+2), divider, Shared section, Projects section, profile w/ status    │
│                      │ (online/busy/away/offline)                                                           │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Sidebar (right)      │ RSidebar: members list, invites, mentions/notifications, InviteMemberModal           │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Invite               │ InviteMemberModal — "Invite people to {workspace}", search "Enter username or        │
│                      │ email", role select Admin/Member/Guest, Send Invite, pending-invites toggle          │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /{slug}/statistics — interval toggle 1W/2W/1M/3M/6M/1Y, StatCards Active Workload,   │
│ Statistics           │ Velocity, Avg. Cycle Time, Recharts area chart "Workspace Velocity" (framer-motion   │
│                      │ staggered blur-in)                                                                   │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Add module           │ AddModuleModal: step 1 cards Task Board ("Track tasks and progress") / Chat Room     │
│                      │ ("Communicate with your crew"); step 2 name input, Create Module                     │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /{slug}/board/{boardId} — Add Column, dnd-kit columns (rename, color, type incl.     │
│ Board                │ COMPLETE), TaskDetailModal: title, rich description, priority NONE→URGENT, deadline, │
│                      │  labels, assignee search. Live via useBoardSocket                                    │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Chat                 │ /{slug}/chat/{roomId} — MessageList, ChatInput, reactions, emoji picker, link        │
│                      │ previews, typing indicator, read receipts, unread badges via chat:unread_increment   │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Projects             │ useCreateProject → "New Project" inline rename; useModuleDnd moves modules between   │
│                      │ Shared droppable and project droppables, persisted by useReorderModules              │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│ Home                 │ /{slug} — greeting + date, Quick Stats (Total Tasks / Completed / In Progress, 2w    │
│                      │ window), Pinned Modules grid (pin toggled from sidebar module)                       │
└──────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┘

⚠️ One correction to the brief: pinning does not pin to the sidebar — isPinned surfaces the module on the Home dashboard "Pinned Modules" grid. Script says "Home" accordingly.

---
90-Second Script

Visual Timing & DOM Targets: 0:00–0:08 — Route / (web). Slow scroll <main> from Hero → Features bento grid, ease
back to top. Hold on H1 "Work in sync. Not in silos."
Voiceover Narration: Your team's work is scattered across five tools. crwsync pulls chat, tasks and schedules into
one real-time workspace.
────────────────────────────────────────
Visual Timing & DOM Targets: 0:08–0:15 — Click header a[href="/auth/signin"] → /auth/signin. Type into #identifier,
then #password. Click button[type=submit] "Sign In". Redirect to dash origin.
Voiceover Narration: Signing in takes seconds. One secure session carries you straight from the site into your
dashboard.
────────────────────────────────────────
Visual Timing & DOM Targets: 0:15–0:22 — Route /create-workspace. Type #ws-name → "Northstar Labs", #ws-slug →
"northstar"
────────────────────────────────────────
Visual Timing & DOM Targets: 0:58–1:12 — AddModuleModal again → Chat Room, name "design-sync" →
/{slug}/chat/{roomId}. Show MessageList receiving a live message, TypingIndicator, hover bubble → EmojiPicker
reaction, ReactionIndicator increments. Cut to sidebar: unread badge on the chat SidebarModule.
Voiceover Narration: Chat rooms live in the same sidebar. Messages, reactions, mentions, typing and read receipts
all stream over the same socket the boards use — so conversation stays next to the work, not in another app.
────────────────────────────────────────
Visual Timing & DOM Targets: 1:12–1:22 — SectionHeader "Projects" → onAdd → inline-rename "New Project" to "Q3
Launch". Drag "Sprint 14" and "design-sync" from the SidebarDroppable id="shared" into the SidebarProject
droppable; both nest under the project.
Voiceover Narration: Create a project, then drag your board and chat room into it. Modules regroup instantly, and
the order sticks for the whole workspace.
────────────────────────────────────────
Visual Timing & DOM Targets: 1:22–1:30 — Click Home (ctrl+1) → /{slug}. Quick Stats tick up; pinned "Sprint 14" and
"design-sync" cards render in the Pinned Modules grid. Fade to /logo@orange.svg on dark, CTA "Join the crew".
Voiceover Narration: Back home: pinned modules, live stats, one screen. Tasks, chat and metrics in sync. crwsync —
join the crew.

---
Word count: 213 words over 90.0 s = 142 words/minute — inside the 130–150 natural-speech band, with breathing room at scene transitions.

Per-scene budget check (target ≈2.37 w/s): 19 / 17 / 16 / 27 / 20 / 39 / 34 / 23 / 18. Scene 6 (0:42–0:58) is the densest at 2.44 w/s — trim "Name your columns." if the read feels rushed.
LINE & SCENE BREAKDOWN (STRICT 90 SECONDS)

  Align the narration precisely with these exact visual scenes and time boundaries:

  | Time Frame | Scene Target | Visual Action (What happens on screen) | Voiceover Tone & Focus |
  | :--- | :--- | :--- | :--- |
  | **0:00 – 0:08** (8s) | Landing Page | Slow, smooth scroll down hero section, then scroll back to top. | **Hook:** Address team fragmentation and introduce `crwsync` as the unified solution. |
  | **0:08 – 0:15** (7s) | Authentication | Navigate to login, fill credentials, submit. | **Auth:** Highlight friction-free, secure entry into the platform. |
  | **0:15 – 0:22** (7s) | Workspace Creation | Pop up modal, type workspace name, click Create. | **Onboarding:** Emphasize instant workspace provisioning for agile teams. |
  | **0:22 – 0:34** (12s) | Workspace & Invites | Pan sidebar navigation. Click "Invite Member", type email, send invite. | **Layout & Team:** Explain clear layout hierarchy and rapid user onboarding. |
  | **0:34 – 0:42** (8s) | Statistics Module | Click Statistics tab; focus on animated metrics/charts. | **Analytics:** Highlight real-time visibility into project and team metrics. |
  | **0:42 – 0:58** (16s) | Task Module & Piin to sidebar, interact with task fields.
PT DELIVERABLE FORMAT

  Provide the output in a structured table containing two main columns:

  1. **Visual Timing & DOM Targets:** Start/End timestamp, exact visual action, and target DOM selectors/routes found during codebase inspection.
  2. **Voiceover Narration:** Exact word-for-word spoken text. Use active, professional language with minimal jargon. Ensure word count matches natural human speech (~130–150 words per minute total, roughly 200–220 words total for the 90 seconds).

  Include a brief summary of total estimated word count and confirmed speaking rate at the end.

  Searched for 1 pattern, read 1 file, listed 2 directories, ran 2 shell commands

Now read key files.

  Read 11 files, ran 4 shell commands

Codebase read. Script below uses real routes, labels, and component names.

┌──────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┐
│         Area         │                                   Reality in code                                    │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ app/page.tsx → Header, Hero, Features, Architecture, Contact, Footer. H1: "Work in   │
│ Landing              │ sync. Not in silos." CTA Join the crew → /auth/signup. Bento features: Kanban Task   │
│ (apps/frontend/web)  │ Boards, Collaborative Workspaces, Real-Time Chat & Messaging, Project Scheduling,    │
│                      │ Notifications                                                                        │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│
│ Add module           │ AddModuleModal: step 1 cards Task Board ("Track tasks and progress") / Chat Room     │
│                      │ ("Communicate with your crew"); step 2 name input, Create Module                     │
├──────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
│                      │ /{slug}/board/{boardId} — Add Column, dnd-kit columns (rename, color, type incl.     │
│ Board                │ COMPLETE), TaskDetailModal: title, rich description, priority NONE→URGENT, deadline, │
│
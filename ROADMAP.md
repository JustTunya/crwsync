# crwsync — Feature Assessment & Completion Roadmap

An exhaustive audit of the **crwsync** platform, detailing completed features, identified technical debt and edge-case issues, missing product capabilities, and a structured, 4-milestone roadmap to a production-grade, feature-rich finish line.

---

## 1. Executive Summary

crwsync is engineered as a decoupled, production-shaped collaboration platform: an independently deployable public portal (`apps/frontend/web`), an authenticated dashboard (`apps/frontend/dash`), and a NestJS API with a horizontal Redis-backed Socket.IO gateway (`apps/backend`).

While the real-time foundation (optimistic UI updates, WebSocket reconciliation, Redis state distribution, and modular workspaces) is exceptionally solid, key functional domains (notably file management, task discussions, settings administration, and persistent notifications) remain either incomplete or unimplemented. This document establishes the blueprint to transition crwsync from a working architectural prototype into an all-around, feature-rich productivity suite.

---

## 2. Completed Features (Working as Intended)

The following features have been verified across the dashboard and backend, functioning end-to-end as intended:

### A. Workspace Management & Routing
* **Multi-Workspace Context Switcher (`SidebarWorkspace.tsx`)**:
  * Seamless workspace switching directly from the left sidebar.
  * Active workspace persisted via `localStorage` (`crw-ws`) and dynamic URL routing (`/[slug]`).
* **Workspace Creation Flow (`/create-workspace`)**:
  * Dedicated creation form with automatic URL slug normalization and uniqueness collision handling.
  * Automatic workspace key generation (e.g., `CRW`) used for human-readable task short IDs.
* **Workspace Member Roster (`RSidebar.tsx`)**:
  * Real-time crew list grouped by hierarchical roles (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
  * Member kick workflows for authorized administrators.
* **Invite Management (`inv-modal.tsx`)**:
  * User search by username or email.
  * Role assignment on invitation dispatch.
  * Pending invitation tab with status inspection and invite revocation.
  * Real-time invite reception and handling via WebSocket events (`invite:received`, `invite:handled`).
* **Workspace-Level Real-Time Sync (`use-workspace-socket.ts`)**:
  * Real-time synchronization of sidebar modules and projects when teammates create, rename, reorder, or delete modules.

### B. Real-Time Kanban Board (`/[slug]/board/[boardId]`)
* **Drag-and-Drop Task Flow**:
  * Powered by `@dnd-kit/core` and `@dnd-kit/sortable` with collision detection (`closestCorners`) and pointer activation constraints.
  * Moves tasks across columns and reorders tasks within columns with optimistic cache updates.
* **Column Lifecycle Management (`KanbanCol.tsx`)**:
  * Creation of columns with custom titles.
  * Inline column renaming.
  * Color picker tagging for column headers.
  * Column type categorization: `UPCOMING`, `ONGOING`, `COMPLETE`.
  * Column deletion with automated backend cleanup.
* **Task Creation & Quick Inputs**:
  * Inline task creation trigger per column.
* **Task Detail Inspection & Editing (`TaskDetailModal.tsx`)**:
  * Inline title editing.
  * Rich text descriptions powered by TipTap (`RichTextEditor.tsx`) supporting bold, italics, underline, lists, and links.
  * Priority selector (`URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE`) with color-coded badges.
  * Due date / deadline selection with calendar popover.
  * Assignee assignment with live workspace member search and avatar badges.
  * Custom label tagging with interactive add/remove chips.
  * Task archiving (enabled when moved to `COMPLETE` columns) and task deletion.
* **Bi-Directional WebSocket Sync (`use-board-socket.ts`)**:
  * Listens on the `/status` Socket.IO namespace for board events: `board:task:created`, `board:task:updated`, `board:task:moved`, `board:column:created`, `board:column:updated`, `board:column:deleted`, and `board:columns:reordered`.
  * Surgical React Query cache updates via `queryClient.setQueryData`.
  * Idempotency guards to eliminate self-mutation flickering.

### C. Real-Time Team Chat (`/[slug]/chat/[roomId]`)
* **Dedicated WebSocket Connection (`use-chat-socket.ts`)**:
  * Scoped `/chat` gateway backed by Redis adapter for horizontal scaling.
* **Optimistic Message Pipeline (`use-chat-store.ts`)**:
  * Instant local rendering of sent messages with temporary client IDs.
  * Reconciliation with server acknowledgments (`message_ack`) and error fallbacks (`message_error`).
* **Interactive Message Composer (`ChatInput.tsx`)**:
  * `@` autocomplete for team member mentions and `@everyone`.
  * `#` task autocomplete querying workspace tasks, displaying task short ID, title, and priority.
  * Integrated emoji picker (`@emoji-mart/react`).
  * Live typing indicator broadcasts (`typing_start`, `typing_stop`).
  * Message reply banner with parent quote previews.
* **Message Rendering & Actions (`MessageBubble.tsx`)**:
  * OpenGraph metadata scraper and rich link cards (`LinkPreview.tsx`).
  * Clickable task chips navigating directly to the associated board.
  * Message editing and soft-deletion (`is_edited`, `is_deleted`).
  * Emoji reactions with live tally counters (`ReactionIndicator.tsx`, `ReactionListModal.tsx`).
  * Read receipts tracking viewer timestamps (`ChatReadReceipt`).

### D. Organization & Navigation
* **Modular Project Tree (`l-sidebar.tsx`)**:
  * Grouping of boards and chat rooms under custom projects or root workspace modules.
  * Fluid drag-and-drop reordering of modules into and out of projects (`use-module-dnd.ts`).
  * Project creation, inline renaming, and deletion.
* **Module Pinning**:
  * Pinning favorite boards or chat channels to populate the "Pinned Modules" section on the Home dashboard.
* **Quick Navigation Dialog (`Cmd+K`)**:
  * Command palette modal to search and jump directly to boards, chat rooms, Home, and Statistics.
* **Live Unread Badges**:
  * Live unread message counters updated via `chat:unread_increment` socket events, cleared on channel focus.

### E. Analytics & Personal Overview
* **Home Dashboard (`/[slug]/home-dashboard.tsx`)**:
  * Dynamic time-of-day greeting and formatted date.
  * Quick-stat indicators: Active Workload, Velocity (completed tasks), and Total Tasks.
  * Interactive grid of pinned workspace modules.
* **Statistics Dashboard (`/[slug]/statistics/statistics-dashboard.tsx`)**:
  * Dynamic time-range selector: `1W`, `2W`, `1M`, `3M`, `6M`, `1Y`, synced with URL search params.
  * Metric cards: Active Workload, Velocity, and Average Cycle Time (formatted across seconds, minutes, hours, and days).
  * Recharts interactive Area Chart displaying workspace velocity timelines.
* **Presence Management (`SidebarProfile.tsx`)**:
  * Real-time status toggle (`ONLINE`, `BUSY`, `AWAY`) saved to Postgres and broadcast across connected peers.

---

## 3. Identified Issues & Technical Debt

The following bugs, structural flaws, and incomplete implementations were detected during the codebase audit:

1. **Empty Settings Page Stub**:
   * `apps/frontend/dash/app/settings/page.tsx` renders raw placeholder copy (`<p>This is the settings page.</p>`). Clicking "Settings" in the user profile menu leads to an unfunctional dead end.
2. **Missing Avatar Storage & Serving Route (`/api/avatars`)**:
   * `components/user-avatar.tsx` and `components/workspace-avatar.tsx` attempt to resolve avatar URLs via `/api/avatars/${avatar_key}`. No such route, controller, or storage handler exists in either the Next.js app or NestJS backend, causing 404s when an avatar key is set.
3. **Double `WorkspaceProvider` Nesting**:
   * `WorkspaceProvider` is mounted at the root in `apps/frontend/dash/app/layout.tsx` and mounted **again** in `apps/frontend/dash/app/[slug]/layout.tsx`. This causes duplicate React Query subscriptions, duplicate network requests for workspace metadata, and redundant renders.
4. **Transient Mention Notifications**:
   * In `hooks/use-mentions.ts`, notifications are maintained strictly in local React component state (`useState`). There is no Prisma `Notification` table or backend endpoint to fetch them. Navigating away or refreshing the browser permanently clears all mention alerts.
5. **Local Type Duplication with Pending TODOs**:
   * `components/r-sidebar.tsx` and `components/inv-modal.tsx` duplicate the `WorkspaceRoleEnum` declaration locally with `//! TODO: Use enum from packages/types`, bypassing the authoritative definition in `@crwsync/types`.
6. **Incomplete Frontend Role-Gating (RBAC)**:
   * While backend endpoints are protected by `@RequireWorkspaceRoles(OWNER, ADMIN)`, the frontend UI renders administrative controls (e.g., delete column, delete project, kick member) for `MEMBER` and `GUEST` roles. Clicking them results in unhandled 403 API errors rather than clean UI disabling or omission.
7. **Client-Side `redirect()` during Render**:
   * `apps/frontend/dash/app/page.tsx` invokes Next.js `redirect()` directly inside the render body of a client component, which can trigger hydration warnings. Routing should be handled via `router.replace()` inside a `useEffect`.

---

## 4. Missing Features Required for Project Completion

To fulfill its stated architectural mission and compete as an all-around collaboration tool, crwsync must address the following missing capabilities:

### A. The "Files" System (Core Brand Promise Gap)
> **Note**: Both `README.md` and `PRODUCT.md` claim crwsync keeps *"tasks, files, and distributed teams in perfect sync"*. Currently, **no file model, file storage service, or file upload UI exists in the repository**.
* **Object Storage Engine**: Integration of an S3-compatible service (MinIO for local dev, AWS S3/Cloudflare R2 for production) in `apps/backend` for presigned uploads, virus scanning, and mime-type validation.
* **Workspace "Files" Module**: A 3rd workspace module type alongside `BOARD` and `CHAT` (`ModuleTypeEnum.FILES`), providing a team drive with folder/grid views, search, previews, and download links.
* **Task Attachments**: File and image upload zone inside `TaskDetailModal.tsx` with thumbnail previews.
* **Chat File Attachments**: Attachment button in `ChatInput.tsx` supporting drag-and-drop file sharing and image lightbox popups in `MessageBubble.tsx`.

### B. Task Collaboration Depth (Linear / Asana Caliber)
* **Task Comments & Discussion Thread**:
  * A dedicated comment stream inside `TaskDetailModal.tsx`.
  * Support for markdown, `@mentions`, and real-time comment synchronization over WebSockets.
* **Subtasks & Checklists**:
  * Interactive checklist items per task with completion progress bars (`3/5`) displayed on both the modal and kanban card.
* **Audit & Activity Trail**:
  * Chronological log tracking state transitions ("*Alice moved task to In Progress*", "*Bob changed priority to High*").
* **Board Filters & View Modes**:
  * Filter toolbar to slice boards by Assignee, Priority, Label, and Due Date.
  * View switcher allowing teams to toggle between the Kanban Board and a List/Table view.

### C. Complete Settings & Administration Suite
* **Account Settings (`/settings`)**:
  * Profile editor: First/last name, username, email, and avatar image upload.
  * Security management: Password change with verification, active session roster with IP/User-Agent data, and remote session revocation.
* **Workspace Administration (`/[slug]/settings`)**:
  * General: Workspace renaming, slug customization, logo upload, and workspace key configuration.
  * Access Control: Comprehensive member directory with role promotion/demotion (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`) and ownership transfer.
  * Danger Zone: Workspace deletion with confirmation modal.

### D. Communication & Notifications Polish
* **Direct Messaging (DMs)**:
  * 1-on-1 private chat rooms between workspace members initiated directly from the member list.
* **Persistent In-App Notifications**:
  * PostgreSQL-backed `Notification` model to persist mentions, task assignments, and invite events.
  * Unread notification badge counter on the top bell icon with "Mark all as read" capability.
* **Desktop & Audio Alerts**:
  * Web Notifications API integration for foreground/background mention alerts.

### E. Omni-Search (`Cmd+K` Spotlight)
* Expanding the quick search dialog from a simple module filter into a global search bar indexing:
  * Modules (boards, chats, files).
  * Tasks (searchable by short ID like `CRW-12` or text query).
  * Chat messages.
  * Workspace members.

### F. Operational, Security & Compliance Gaps (Not Covered by Feature Milestones)
> **Note**: These are gaps in the roadmap's original scope, not just the codebase — flagged in review because completing Milestones 1–4 produces a *feature-complete* product, not necessarily a *production-hardened* one. See revised Finish Line definition in §6.
* **CI/CD Pipeline**: No GitHub Actions (or equivalent) workflow exists to run lint/typecheck/tests on PRs. `pnpm lint` and test suites are currently manual, developer-run steps only.
* **Observability & Error Tracking**: No APM or error-tracking integration (e.g., Sentry) beyond the existing `LoggingInterceptor`/`AllExceptionsFilter`. No structured log aggregation or alerting exists for production incidents.
* **Ongoing Security Hardening Process**: The recent SSRF fix in `chat.service.ts` (commit `80e9aad`) shows security issues surface reactively. No recurring dependency vulnerability scan, rate-limit audit, or secret-rotation policy is scheduled.
* **Concrete Test Coverage Targets**: "Comprehensive Test Coverage" (Milestone 4) has no coverage percentage, no CI gate, and no backend (NestJS service/unit) test requirement — only frontend DnD/chat-store tests and one E2E flow are specified.
* **Legal & Compliance Pages**: No Terms of Service, Privacy Policy, or data export/deletion flow — expected baseline for a product presented as production-grade.
* **Accessibility & Internationalization**: No a11y audit (contrast, keyboard nav, screen reader labels) or i18n pass scheduled anywhere in the roadmap.
* **Demo/Seed Data Story**: No seed script or demo mode for populating a fresh workspace with realistic data — relevant for portfolio review and onboarding.
* **Environment & Config Reference**: No `.env.example` audit or documented reference of required environment variables, despite `main.ts`'s fail-fast-on-missing-config behavior.
* **Full Auth Flow Completeness**: Milestone 1's "security management" covers password *change* and session revocation, but not forgot-password/reset or signup email verification — both baseline auth expectations.
* **Load-Test Pass/Fail Criteria**: Milestone 4's "run full benchmark suite to validate Redis fan-out latency under load" has no defined threshold (target latency, concurrent connection count) — not currently actionable as a checklist item.

---

## 5. Strategic 4-Milestone Roadmap

```
Milestone 1: Architectural Fixes & Settings Foundation
   │
   ▼
Milestone 2: Files & Media Storage Engine (Core Brand Promise)
   │
   ▼
Milestone 3: Deep Collaboration & Task Enhancements
   │
   ▼
Milestone 4: Omni-Search, Performance Hardening & Production Finish Line
   │
   ▼
Milestone 5: Operational Hardening & Long-Term Maintainability
```

---

### Milestone 1: Architectural Integrity & Settings Foundation
**Goal**: Eliminate technical debt, resolve broken routing, and establish complete administrative control.

- [x] **Fix Provider Hierarchy**:
  - Remove redundant `<WorkspaceProvider>` from `apps/frontend/dash/app/[slug]/layout.tsx`.
- [x] **Consolidate Domain Enums**:
  - Remove local `WorkspaceRoleEnum` definitions in `r-sidebar.tsx` and `inv-modal.tsx`; import directly from `@crwsync/types`.
- [x] **Build Account Settings (`/settings`)**:
  - Implement user profile edit form (first name, last name, username).
  - Implement security tab: password update and session management table with "Revoke Session" actions.
- [x] **Build Workspace Settings (`/[slug]/settings`)**:
  - Build workspace general settings: rename workspace, update slug.
  - Build member role administration: promote/demote members, transfer ownership.
  - Build Danger Zone: workspace deletion with validation input.
- [x] **Enforce UI Role-Gating**:
  - Conditionally render administrative actions (delete column, delete project, kick member) based on current user's workspace role.
- [x] **Fix Root Page Redirection**:
  - Refactor `apps/frontend/dash/app/page.tsx` to handle routing via `router.replace()` inside `useEffect`.

---

### Milestone 2: Files & Media Storage Engine
**Goal**: Deliver the missing file storage pillar and fulfill the platform's core promise of syncing tasks and files.

- [ ] **Backend Storage Service**:
  - Implement S3/MinIO service in `apps/backend` for presigned upload URLs and file retrieval.
  - Implement `/api/avatars/:key` and `/api/files/:key` streaming endpoints.
- [ ] **User & Workspace Avatar Upload**:
  - Add image upload components to User Settings and Workspace Settings.
- [ ] **Task Attachments**:
  - Add `TaskAttachment` model in Prisma schema.
  - Add drag-and-drop file upload zone in `TaskDetailModal.tsx`.
  - Display attachment previews, download links, and file size badges.
- [ ] **Chat Media & File Attachments**:
  - Add attachment trigger to `ChatInput.tsx`.
  - Render image previews with lightbox modal and downloadable file cards in `MessageBubble.tsx`.
- [ ] **Workspace "Files" Module**:
  - Add `FILES` to `ModuleTypeEnum` in `schema.prisma`.
  - Build team file drive page (`/[slug]/files/[fileRoomId]`) with grid/list views, file uploads, and deletion.

---

### Milestone 3: Deep Collaboration & Task Enhancements
**Goal**: Upgrade task tracking and communication from basic cards into an enterprise-grade collaboration engine.

- [ ] **Task Comments & Discussion**:
  - Add `TaskComment` model in Prisma schema with foreign keys to `Task` and `User`.
  - Build comment feed inside `TaskDetailModal.tsx` with TipTap editor, `@mentions`, and timestamps.
  - Broadcast `task:comment:created` and `task:comment:deleted` events via `StatusGateway`.
- [ ] **Task Subtasks / Checklists**:
  - Add `TaskChecklistItem` model in Prisma.
  - Implement interactive checklists in `TaskDetailModal.tsx` and progress indicators on Kanban cards.
- [ ] **Task Activity Audit Trail**:
  - Track column moves, priority changes, assignee updates, and deadline edits in a `TaskActivity` table.
  - Display chronological activity tab in `TaskDetailModal.tsx`.
- [ ] **Board Filters & View Modes**:
  - Implement filter bar in `BoardPage` (Assignee, Priority, Label).
  - Add toggle between Kanban board view and List/Table view.
- [ ] **Direct Messaging (DMs)**:
  - Add support for 1-on-1 private rooms between workspace members.
- [ ] **Persistent Notifications**:
  - Add `Notification` model to Prisma schema.
  - Hydrate notification bell in `RSidebar.tsx` on load and provide "Mark all as read".

---

### Milestone 4: Omni-Search, Polish & Production Certification
**Goal**: Unify platform search, harden performance, and achieve production certification.

- [ ] **Global Omni-Search (`Cmd+K`)**:
  - Upgrade search modal to index modules, tasks (`CRW-12`), chat messages, and workspace members.
- [ ] **Desktop & Audio Notifications**:
  - Integrate Web Notifications API for incoming mentions and task assignments.
- [ ] **Comprehensive Test Coverage**:
  - Add frontend integration tests for Kanban drag-and-drop and chat stores.
  - Implement end-to-end Playwright test suite covering:
    `Sign In → Create Workspace → Add Board → Create & Move Task → Send Chat → Upload File`.
- [ ] **Production Deployment Validation**:
  - Verify standalone Docker multi-stage builds (`Dockerfile` and `stack.yml`).
  - Run full benchmark suite to validate Redis fan-out latency under load, against a defined pass/fail threshold (target p95 latency, concurrent connection count).

---

### Milestone 5: Operational Hardening & Long-Term Maintainability
**Goal**: Move crwsync from feature-complete to operationally production-hardened — the gap between "works when demoed" and "safe to leave running unattended."

- [ ] **CI/CD Pipeline**:
  - Add GitHub Actions workflow running `pnpm lint`, typecheck, and test suites on every PR; block merge on failure.
- [ ] **Observability & Error Tracking**:
  - Integrate an error-tracking service (e.g., Sentry) across `apps/backend`, `apps/frontend/web`, and `apps/frontend/dash`.
  - Add structured log aggregation and basic alerting for production incidents.
- [ ] **Recurring Security Process**:
  - Add scheduled dependency vulnerability scanning (e.g., `pnpm audit` / Dependabot).
  - Document a rate-limit and secret-rotation review cadence.
- [ ] **Backend Test Coverage**:
  - Set an explicit coverage target (e.g., 70%+) for `apps/backend` services/guards.
  - Wire coverage reporting into the CI pipeline from the milestone above.
- [ ] **Legal & Compliance Pages**:
  - Add Terms of Service and Privacy Policy pages.
  - Add account data export and deletion flow.
- [ ] **Accessibility & Internationalization Pass**:
  - Audit contrast, keyboard navigation, and screen-reader labels across dashboard and public portal.
- [ ] **Demo/Seed Data**:
  - Add a seed script (or demo mode) that populates a fresh workspace with realistic boards, chat history, and members.
- [ ] **Environment & Config Reference**:
  - Publish a documented `.env.example` covering every required environment variable per app.
- [ ] **Complete Auth Flows**:
  - Implement forgot-password/reset flow and signup email verification.

---

## 6. The Finish Line Definition

Completion is two separate tiers. Reaching Tier 1 does **not** imply the product needs zero further changes — it means the feature surface is done. Tier 2 is what makes it safe to run unattended in production.

### Tier 1 — Feature-Complete (Milestones 1–4)

You can confidently say **crwsync is a completed, fully-working, feature-rich, all-around tool** when the following criteria are satisfied:

1. **Zero Dead Ends**:
   * Every button, link, modal, and route (including `/settings`, `/[slug]/settings`, and avatar images) is backed by live database persistence and APIs.
2. **The Brand Promise is 100% Backed by Working Code**:
   * Real-time sync covers **tasks, chat, and files** with zero mock or simulated layers (with transactional email safely scoped to operator SMTP credentials).
3. **Autonomous Team Workflow**:
   * A distributed crew can run their daily operations end-to-end: plan sprints on the board, discuss cards in threaded comments, upload project deliverables, coordinate via group channels and direct messages, and manage organization roles without needing external tools.

### Tier 2 — Production-Hardened (Milestone 5)

Tier 1 alone is not "requires no additional changes or updates" — no shipped software reaches that state, and this roadmap's own §4.F gaps prove it: without CI, regressions ship silently; without observability, incidents go undetected until reported; without a recurring security process, the next SSRF-class bug (see commit `80e9aad`) sits undiscovered instead of caught by process. Tier 2 is satisfied when:

1. **Regressions Are Caught Before Merge**: CI runs lint, typecheck, and tests on every PR.
2. **Incidents Are Visible, Not Silent**: error tracking and log aggregation exist across all three apps.
3. **Security Is a Process, Not a One-Off Fix**: recurring dependency scans and a documented rotation/audit cadence exist.
4. **The Product Is Legally and Operationally Deployable**: legal pages, data export/deletion, and full auth flows (reset, verification) exist.

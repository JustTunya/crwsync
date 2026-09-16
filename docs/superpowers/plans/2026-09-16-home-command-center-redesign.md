# Workspace Home Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the static, minimal workspace Home module into a high-density, Linear-grade Command Center that dynamically aggregates personal tasks, project progress, pinned tools, crew presence, and live activity streams.

**Architecture:** Aggregated backend endpoint (`GET /workspaces/:workspaceId/home`) utilizing parallel Prisma queries with explicit selects and short-TTL Redis caching. Frontend responsive Bento Grid powered by TanStack Query, optimistic UI mutations, and real-time Socket.IO synchronization, styled strictly within the *Warm Control Room* design system (`DESIGN.md`).

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, TanStack Query v5, Radix UI, Hugeicons, NestJS, Prisma, Redis, Socket.IO.

**Spec:** `docs/superpowers/specs/2026-09-16-home-command-center-redesign.md`

## Global Constraints

- **Design System**: Warm OKLCH neutrals (~64° hue), single Ember Orange (`oklch(0.703 0.188 36.91)`) accent reserved for CTAs and critical urgency, Figtree typography, frosted `GlassBox` surfaces with hairline borders.
- **Coding Style**: Zero inline comments, double quotes, 2-space indentation, semicolons on statements, strict TypeScript (`strict: true`), absolute path aliases (`@/*` in dash, `src/*` in backend).
- **Service Layer Pattern**: Frontend service methods return `{ success, data?, message?, errors? }` and normalize errors without throwing; hooks decide when to throw.
- **Cache-First**: Redis-backed `CacheService` with key `CacheKeys.workspaceHome` (120s TTL) and granular cache invalidation on mutations.
- **Accessibility**: Full keyboard navigation (`Tab`, `Space`, `Enter`, `C`/`N` for new task, `⌘K` for OmniSearch), ARIA landmarks and live announcer alerts for completed tasks.

---

### Task 1: Shared Types & Data Contracts (`packages/types`)

**Files:**
- Modify: `packages/types/src/workspace.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces: `WorkspaceHomeData`, `WorkspaceHomeSummary`, `HomeTaskItem`, `HomeProjectSummary`, `HomePinnedModule`, `HomeActivityItem`, `HomeMemberPresence`

- [ ] **Step 1: Add Workspace Home domain types to `packages/types/src/workspace.ts`**

```typescript
export interface WorkspaceHomeSummary {
  greeting: string;
  todayFormatted: string;
  urgentCount: number;
  activeTasksCount: number;
  completionVelocity: number;
  workspaceMembersCount: number;
}

export interface HomeTaskItem {
  id: string;
  title: string;
  priority: TaskPriorityEnum;
  status: string;
  columnId: string;
  boardId: string;
  boardTitle: string;
  projectId?: string;
  projectName?: string;
  dueDate: string | null;
  commentsCount: number;
  attachmentsCount: number;
  checklistTotal: number;
  checklistCompleted: number;
}

export interface HomeProjectSummary {
  id: string;
  title: string;
  color?: string | null;
  boardId?: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
  }>;
}

export interface HomePinnedModule {
  id: string;
  name: string;
  type: WorkspaceModuleTypeEnum;
  isPinned: boolean;
  color?: string | null;
  badgeCount?: number;
  lastActive?: string;
}

export interface HomeActivityItem {
  id: string;
  type: "task_created" | "task_moved" | "task_completed" | "comment_added" | "file_uploaded";
  message: string;
  actor: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  target: {
    id: string;
    title: string;
    href: string;
  };
  createdAt: string;
}

export interface HomeMemberPresence {
  id: string;
  name: string;
  role: WorkspaceRoleEnum;
  avatarUrl?: string | null;
  isOnline: boolean;
  activeStatus?: string;
}

export interface WorkspaceHomeData {
  summary: WorkspaceHomeSummary;
  myFocus: {
    overdue: HomeTaskItem[];
    dueToday: HomeTaskItem[];
    inProgress: HomeTaskItem[];
  };
  projects: HomeProjectSummary[];
  pinnedModules: HomePinnedModule[];
  recentActivity: HomeActivityItem[];
  crew: HomeMemberPresence[];
}
```

- [ ] **Step 2: Ensure `packages/types/src/index.ts` exports all new types**

Verify all new interfaces from `workspace.ts` are re-exported in `packages/types/src/index.ts`.

- [ ] **Step 3: Build the types package**

Run: `pnpm --filter @crwsync/types build`
Expected: PASS with `.d.ts` and `.js` emitted cleanly.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/workspace.ts packages/types/src/index.ts
git commit -m "feat(types): add WorkspaceHomeData and home cockpit domain contracts"
```

---

### Task 2: Backend Aggregation Engine & Redis Caching (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/redis/cache-keys.ts`
- Modify: `apps/backend/src/workspace/workspace.service.ts`
- Create: `apps/backend/src/workspace/workspace.service.home.spec.ts`

**Interfaces:**
- Consumes: `WorkspaceHomeData` from `@crwsync/types`, `PrismaService`, `CacheService`
- Produces: `WorkspaceService.getHomeData(workspaceId: string, userId: string): Promise<WorkspaceHomeData>`

- [ ] **Step 1: Add `workspaceHome` cache key in `apps/backend/src/redis/cache-keys.ts`**

```typescript
export const CacheKeys = {
  // ... existing keys
  workspaceHome: (workspaceId: string, userId: string) =>
    `ws:${workspaceId}:home:${userId}`,
  workspaceHomePattern: (workspaceId: string) => `ws:${workspaceId}:home:*`,
};
```

- [ ] **Step 2: Write unit test suite in `apps/backend/src/workspace/workspace.service.home.spec.ts`**

Test:
1. Returns cached home data when cache hit occurs.
2. Aggregates overdue, due today, and in progress tasks for the user when cache misses.
3. Calculates project task progress percentage accurately.
4. Correctly assembles recent task activities into `HomeActivityItem` shape.
5. Inverts zero tasks / zero projects gracefully without divide-by-zero errors.

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @crwsync/backend test src/workspace/workspace.service.home.spec.ts`
Expected: FAIL (`getHomeData` is not a function).

- [ ] **Step 4: Implement `getHomeData` in `apps/backend/src/workspace/workspace.service.ts`**

Implement:
- Cache lookup via `this.cache.get<WorkspaceHomeData>(CacheKeys.workspaceHome(workspaceId, userId))`.
- Parallel queries using `Promise.all`:
  1. `tasks`: Active user tasks where `assignee_id = userId` and `workspace_id = workspaceId`, categorized into `overdue`, `dueToday`, and `inProgress`.
  2. `projects`: Workspace projects with task counts (`COMPLETE` vs total) and member avatars.
  3. `pinnedModules`: Modules pinned by user or workspace with contextual badge counts.
  4. `recentActivity`: 15 most recent `TaskActivity` records with actor and task joins.
  5. `crew`: Workspace members with roles and online status.
- Cache storage with `CacheTTL.SHORT` (120 seconds).

- [ ] **Step 5: Run unit tests to verify they pass**

Run: `pnpm --filter @crwsync/backend test src/workspace/workspace.service.home.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/redis/cache-keys.ts apps/backend/src/workspace/workspace.service.ts apps/backend/src/workspace/workspace.service.home.spec.ts
git commit -m "feat(backend): implement WorkspaceService.getHomeData aggregation engine with tests"
```

---

### Task 3: Backend Controller Endpoint & Cache Invalidation (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/workspace/workspace.controller.ts`
- Modify: `apps/backend/src/workspace/workspace.service.ts` (cache invalidation helper)
- Modify: `apps/backend/src/board/board.service.ts` (invalidate workspaceHome on task mutations)

**Interfaces:**
- Produces: `GET /workspaces/:workspaceId/home`

- [ ] **Step 1: Wire endpoint in `apps/backend/src/workspace/workspace.controller.ts`**

```typescript
  @Get(":workspaceId/home")
  @SkipThrottle()
  @UseGuards(IsMemberGuard)
  getHomeData(
    @Param("workspaceId", ParseUUIDPipe) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.workspaceService.getHomeData(workspaceId, user.userId);
  }
```

- [ ] **Step 2: Add cache invalidation hook in `WorkspaceService` & `BoardService`**

Add helper in `WorkspaceService`:
```typescript
async invalidateWorkspaceHome(workspaceId: string) {
  await this.cache.delPattern(CacheKeys.workspaceHomePattern(workspaceId));
}
```
Trigger `invalidateWorkspaceHome` on task create, update, delete, column move, and module pin/unpin operations.

- [ ] **Step 3: Run backend test suite**

Run: `pnpm --filter @crwsync/backend test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/workspace/workspace.controller.ts apps/backend/src/workspace/workspace.service.ts apps/backend/src/board/board.service.ts
git commit -m "feat(backend): wire GET /workspaces/:workspaceId/home and smart cache invalidation"
```

---

### Task 4: Frontend Home Service, Query Keys & TanStack Query Hook (`apps/frontend/dash`)

**Files:**
- Modify: `apps/frontend/dash/hooks/query-keys.ts`
- Create: `apps/frontend/dash/services/home.service.ts`
- Create: `apps/frontend/dash/hooks/use-workspace-home.ts`
- Create: `apps/frontend/dash/hooks/use-workspace-home.test.ts`

**Interfaces:**
- Consumes: `WorkspaceHomeData` from `@crwsync/types`
- Produces: `homeKeys`, `homeService.getWorkspaceHome`, `useWorkspaceHome(workspaceId)`

- [ ] **Step 1: Add `homeKeys` in `apps/frontend/dash/hooks/query-keys.ts`**

```typescript
export const homeKeys = {
  all: ["home"] as const,
  detail: (workspaceId: string) => [...homeKeys.all, "detail", workspaceId] as const,
};
```

- [ ] **Step 2: Create `apps/frontend/dash/services/home.service.ts`**

```typescript
import { WorkspaceHomeData, WorkspaceOperationState } from "@crwsync/types";
import { getApiUrl } from "@/lib/utils";

export async function getWorkspaceHome(
  workspaceId: string
): Promise<WorkspaceOperationState<WorkspaceHomeData>> {
  try {
    const res = await fetch(`${getApiUrl()}/workspaces/${workspaceId}/home`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      return { success: false, message: `Failed to fetch home data: ${res.statusText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
```

- [ ] **Step 3: Create `apps/frontend/dash/hooks/use-workspace-home.ts`**

Implement `useWorkspaceHome(workspaceId)` using TanStack Query `useQuery` with `staleTime: 2 * 60 * 1000`.

- [ ] **Step 4: Write unit test for `useWorkspaceHome` hook**

Verify query fetching, success handling, and query key usage.

- [ ] **Step 5: Run unit tests**

Run: `pnpm --filter @crwsync/dash test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/hooks/query-keys.ts apps/frontend/dash/services/home.service.ts apps/frontend/dash/hooks/use-workspace-home.ts apps/frontend/dash/hooks/use-workspace-home.test.ts
git commit -m "feat(dash): add home API service and useWorkspaceHome query hook"
```

---

### Task 5: Home Header & Workspace Pulse Status (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomeHeader.tsx`
- Create: `apps/frontend/dash/components/home/HomeHeader.test.tsx`

**Interfaces:**
- Consumes: `WorkspaceHomeSummary`, `LSidebarToggle`, `RSidebarToggle`
- Produces: `HomeHeader` component with greeting, urgent pulse chip, and action buttons (`+ New Task`, `⌘K Search`, `Refresh`).

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomeHeader.tsx`**

Features:
- Dynamic time-of-day greeting (`Good morning / afternoon / evening, <Firstname>`).
- Live pulse badge with urgency counts (e.g. `2 overdue · 3 due today`).
- `+ New Task` button (Ember Orange accent).
- `⌘K Search` hotkey trigger button.
- Clean responsive layout with `LSidebarToggle` and `RSidebarToggle`.

- [ ] **Step 2: Write test for `HomeHeader` in `HomeHeader.test.tsx`**

Verify greeting format, pulse chip text, and button click handlers.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test HomeHeader`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomeHeader.tsx apps/frontend/dash/components/home/HomeHeader.test.tsx
git commit -m "feat(dash): add HomeHeader with greeting, live pulse status, and action buttons"
```

---

### Task 6: Interactive Task Row (`HomeTaskRow`) with Inline Completion & Reschedule (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomeTaskRow.tsx`
- Create: `apps/frontend/dash/components/home/HomeTaskRow.test.tsx`

**Interfaces:**
- Consumes: `HomeTaskItem`, `QuickRescheduleMenu`, `PRIORITY_STYLES`, `DEADLINE_STYLES`
- Produces: `HomeTaskRow` component supporting inline completion check, priority badge, breadcrumb navigation, quick rescheduling, metadata counters, and onSelect opening `TaskDetailModal`.

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomeTaskRow.tsx`**

Features:
- Completion circular button with hover checkmark icon.
- Priority chip with discrete colors (`Urgent`, `High`, `Medium`, `Low`, `None`).
- Board/Project breadcrumb badge.
- Due date pill wrapped in `QuickRescheduleMenu`.
- Metadata counters (checklist ratio `3/5`, comments bubble `💬 2`, attachments `📎 1`).
- Keyboard accessible (`Enter`/`Space` triggers detail modal, check button triggers completion).

- [ ] **Step 2: Write test for `HomeTaskRow` in `HomeTaskRow.test.tsx`**

Verify completion toggle trigger, reschedule trigger, and row click propagation.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test HomeTaskRow`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomeTaskRow.tsx apps/frontend/dash/components/home/HomeTaskRow.test.tsx
git commit -m "feat(dash): add HomeTaskRow with inline completion, quick rescheduling, and metadata badges"
```

---

### Task 7: "My Focus & Up Next" Section (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomeMyFocusSection.tsx`
- Create: `apps/frontend/dash/components/home/HomeMyFocusSection.test.tsx`

**Interfaces:**
- Consumes: `HomeTaskItem[]` grouped by urgency (`overdue`, `dueToday`, `inProgress`)
- Produces: `HomeMyFocusSection` component with urgency segmented tabs, list rendering, and empty state illustrations.

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomeMyFocusSection.tsx`**

Features:
- Segmented tab switcher: *Overdue (N)*, *Due Today (N)*, *In Progress (N)*.
- Automatic alert styling on the *Overdue* tab when overdue count > 0.
- Render list of `HomeTaskRow` items with staggered Framer Motion reveal.
- Warm empty state when a tab has zero tasks (e.g. *"All caught up! No overdue tasks."*).

- [ ] **Step 2: Write test in `HomeMyFocusSection.test.tsx`**

Verify tab switching, count badge updates, and empty state rendering.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test HomeMyFocusSection`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomeMyFocusSection.tsx apps/frontend/dash/components/home/HomeMyFocusSection.test.tsx
git commit -m "feat(dash): add HomeMyFocusSection with urgency tabs, task lists, and empty states"
```

---

### Task 8: Active Projects & Boards Section (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomeActiveProjectsSection.tsx`
- Create: `apps/frontend/dash/components/home/HomeActiveProjectsSection.test.tsx`

**Interfaces:**
- Consumes: `HomeProjectSummary[]`, `slug: string`
- Produces: `HomeActiveProjectsSection` component with progress meters, task counts, and collaborator avatar stacks.

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomeActiveProjectsSection.tsx`**

Features:
- Glass cards representing workspace projects.
- Progress bar displaying percentage completed.
- Task counts: `completed / total tasks`.
- Avatar stack of active collaborators with tooltips.
- Click card to navigate directly to the board route `/${slug}/board/${boardId}`.

- [ ] **Step 2: Write test in `HomeActiveProjectsSection.test.tsx`**

Verify rendering of project cards, progress bar calculations, and board navigation links.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test HomeActiveProjectsSection`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomeActiveProjectsSection.tsx apps/frontend/dash/components/home/HomeActiveProjectsSection.test.tsx
git commit -m "feat(dash): add HomeActiveProjectsSection with progress meters and member avatar stacks"
```

---

### Task 9: Enriched Pinned Modules Section (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomePinnedModulesSection.tsx`
- Create: `apps/frontend/dash/components/home/HomePinnedModulesSection.test.tsx`

**Interfaces:**
- Consumes: `HomePinnedModule[]`, `useTogglePinModule`
- Produces: `HomePinnedModulesSection` component with live context badges and hover unpin actions.

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomePinnedModulesSection.tsx`**

Features:
- Grid of glass cards representing pinned modules (Schedules, Chat, Files, Statistics).
- Module icon, custom color badge, and live context subtitle (e.g., `8 upcoming deadlines`, `3 unread messages`).
- Subtle unpin button on hover.
- Empty state prompting user to pin modules from the sidebar.

- [ ] **Step 2: Write test in `HomePinnedModulesSection.test.tsx`**

Verify module links, icon rendering, and unpin mutation calls.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test HomePinnedModulesSection`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomePinnedModulesSection.tsx apps/frontend/dash/components/home/HomePinnedModulesSection.test.tsx
git commit -m "feat(dash): add HomePinnedModulesSection with live context badges and unpin controls"
```

---

### Task 10: Crew Presence & Live Activity Stream Pulse Sections (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomeCrewPresenceSection.tsx`
- Create: `apps/frontend/dash/components/home/HomeActivityStreamSection.tsx`

**Interfaces:**
- Consumes: `HomeMemberPresence[]`, `HomeActivityItem[]`, `useTimeAgo`
- Produces: `HomeCrewPresenceSection` and `HomeActivityStreamSection`

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomeCrewPresenceSection.tsx`**

Features:
- Workspace crew list with avatars, name, and role pill (`Owner`, `Admin`, `Member`, `Guest`).
- Glowing live status dot (green for online, muted for offline).
- Direct 1-click message icon button navigating to `/chat` or DM room.

- [ ] **Step 2: Create `apps/frontend/dash/components/home/HomeActivityStreamSection.tsx`**

Features:
- Timeline stream of workspace activity items.
- Actor avatar, action description, clickable target link, and relative time badge (`useTimeAgo`).

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomeCrewPresenceSection.tsx apps/frontend/dash/components/home/HomeActivityStreamSection.tsx
git commit -m "feat(dash): add HomeCrewPresenceSection and HomeActivityStreamSection pulse components"
```

---

### Task 11: Personal Momentum Velocity Card & Bento Shimmer Skeleton (`apps/frontend/dash`)

**Files:**
- Create: `apps/frontend/dash/components/home/HomeVelocityCard.tsx`
- Create: `apps/frontend/dash/components/home/HomeSkeleton.tsx`

**Interfaces:**
- Consumes: `WorkspaceHomeSummary`
- Produces: `HomeVelocityCard` and `HomeSkeleton`

- [ ] **Step 1: Create `apps/frontend/dash/components/home/HomeVelocityCard.tsx`**

Features:
- Compact momentum card showing tasks completed this cycle.
- Visual progress bar and trend delta pill (`+18% velocity`).

- [ ] **Step 2: Create `apps/frontend/dash/components/home/HomeSkeleton.tsx`**

Features:
- Skeleton loader mirroring the exact Bento layout: Header skeleton, My Focus list skeleton, Project cards skeleton, Crew list skeleton, and Activity stream skeleton.
- Smooth shimmer animation with zero layout shift.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @crwsync/dash test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/home/HomeVelocityCard.tsx apps/frontend/dash/components/home/HomeSkeleton.tsx
git commit -m "feat(dash): add HomeVelocityCard and HomeSkeleton matching Bento layout"
```

---

### Task 12: Integrated Home Dashboard Container with Real-Time Sockets & Modal Flow (`apps/frontend/dash`)

**Files:**
- Modify: `apps/frontend/dash/app/[slug]/home-dashboard.tsx`
- Modify: `apps/frontend/dash/app/[slug]/page.tsx`

**Interfaces:**
- Consumes: All `components/home/*`, `useWorkspaceHome`, `useWorkspaceSocket`, `TaskDetailModal`, `OmniSearchModal`
- Produces: Complete, interactive Home Command Center dashboard

- [ ] **Step 1: Refactor `apps/frontend/dash/app/[slug]/home-dashboard.tsx`**

Implement:
- Connect `useWorkspaceHome(workspaceId)`.
- Mount `HomeHeader`, `HomeMyFocusSection`, `HomeActiveProjectsSection`, `HomePinnedModulesSection`, `HomeCrewPresenceSection`, `HomeActivityStreamSection`, `HomeVelocityCard`.
- Wire `useWorkspaceSocket` listeners (`task:created`, `task:updated`, `task:moved`, `task:deleted`, `activity:created`, `user:status:changed`) for real-time cache patching.
- Dynamically import and mount `TaskDetailModal` when `activeTask` is selected.
- Optimistic task completion handler using `boardService.updateTask`.
- Quick task reschedule handler.
- Hotkeys: `C` / `N` for new task, `⌘K` for OmniSearch.

- [ ] **Step 2: Verify `apps/frontend/dash/app/[slug]/page.tsx`**

Ensure `HomeSkeleton` is passed as the Suspense fallback.

- [ ] **Step 3: Run dash test suite**

Run: `pnpm --filter @crwsync/dash test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/app/[slug]/home-dashboard.tsx apps/frontend/dash/app/[slug]/page.tsx
git commit -m "feat(dash): integrate full Home Command Center dashboard with real-time sockets and task modal flow"
```

---

### Task 13: End-to-End Component Tests & Monorepo Build/Lint Verification

**Files:**
- Create: `apps/frontend/dash/app/[slug]/home-dashboard.test.tsx`

**Interfaces:**
- Validates: Full integration across frontend and backend, ensuring zero regressions, strict type-checking, and lint compliance.

- [ ] **Step 1: Write integration tests in `apps/frontend/dash/app/[slug]/home-dashboard.test.tsx`**

Test scenarios:
1. Renders full Bento layout when data loads.
2. Handles empty tasks, empty projects, and zero pinned modules cleanly.
3. Renders skeleton state during loading.
4. Handles error states gracefully with a retry button.
5. Verifies task completion toggle calls mutation and updates state.
6. Verifies clicking a task opens `TaskDetailModal`.

- [ ] **Step 2: Run all frontend unit & component tests**

Run: `pnpm --filter @crwsync/dash test`
Expected: All tests PASS.

- [ ] **Step 3: Run all backend unit & integration tests**

Run: `pnpm --filter @crwsync/backend test`
Expected: All tests PASS.

- [ ] **Step 4: Run monorepo lint and typecheck**

Run: `pnpm lint && pnpm typecheck` (or `pnpm build`)
Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/app/[slug]/home-dashboard.test.tsx
git commit -m "test(dash): add comprehensive integration tests for Home Command Center and verify monorepo build"
```

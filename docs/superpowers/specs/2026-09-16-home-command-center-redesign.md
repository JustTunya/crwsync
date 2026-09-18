# Workspace Home Command Center Redesign — Design Specification

## 1. Overview & Purpose

The **Workspace Home** (`/${slug}`) is the primary entry point and command center for a crew within crwsync. The existing home page is static, minimal, and lacks the density, utility, and polish expected of a modern collaboration platform.

This specification outlines the complete redesign of the Home module into a **Linear-grade Workspace Command Center**. Inspired by the high-density, keyboard-fluent cockpits of Linear and Raycast, the new Home dynamically aggregates personal action items, active project momentum, pinned workspace tools, live crew presence, and real-time activity streams into a cohesive, warm-glass bento interface.

---

## 2. Design Principles & "Warm Control Room" Identity

1. **The Warm Control Room Aesthetic (`DESIGN.md`)**:
   - **Canvas & Surfaces**: Frosted glass panels (`GlassBox`) over a warm neutral paper canvas (`oklch(1.00 0.007 64.35)`). Hairline warm borders (`oklch(0.87 0.015 64.35)`).
   - **The One Ember Rule**: Ember Orange (`oklch(0.703 0.188 36.91)`) is strictly reserved for primary CTAs (`+ New Task`), active tab indicators, and critical urgency markers. Large surfaces remain warm neutrals.
   - **No Cold Grays**: All borders, text, cards, and backgrounds use the single ~64° warm hue family.
   - **Depth Through Layering**: Clean translucent glass surfaces with backdrop blur, subtle hover state elevations, and fluid Framer Motion spring physics.

2. **High-Density, Action-First Mental Model**:
   - Every element on the Home canvas is actionable. Users can check off tasks, reschedule due dates, open detail modals, jump into active project boards, launch direct messages with teammates, and jump to pinned modules in 1 click.

3. **Sub-100ms Perceived Speed**:
   - Instant initial load powered by a single aggregated backend endpoint (`GET /workspaces/:workspaceId/home`) backed by Redis short caching (2-min TTL) and smart cache invalidation.
   - Zero layout shift through structured skeleton loaders matching the exact Bento layout.

4. **Real-Time Workspace Sync**:
   - Connected via Socket.IO: task changes, member online/offline status, and live activity events update the Home canvas instantly without manual refreshes.

---

## 3. Visual Layout & Component Structure

### 3.1 Responsive Bento Grid Blueprint

```
+---------------------------------------------------------------------------------------------------------------+
| Home [Icon]   Good morning, Tunya  [• 3 tasks due today · 94% on track]           [+ New Task] [⌘K Search]    |
+-----------------------------------------------------------------------+---------------------------------------+
|  MAIN ACTION COLUMN (~65% width)                                      |  WORKSPACE PULSE (~35% width)         |
|                                                                       |                                       |
|  v MY FOCUS & UP NEXT                                                 |  v CREW PRESENCE (5 online)           |
|  [ Tabs: Overdue (2) | Due Today (3) | In Progress (5) ]              |  (•) Alex Rivers    [Lead]      [💬]  |
|  ------------------------------------------------------------------   |  (•) Sarah Chen     [Member]    [💬]  |
|  [ ] CRW-104 Fix Redis TTL invalidation      [Urgent] [Today] [💬3]    |  (•) Marcus Vance   [Member]    [💬]  |
|  [ ] CRW-89  Implement Schedules view        [High]   [Today] [📎2]    |  ( ) Elena Rostova  [Offline]   [💬]  |
|  [ ] CRW-72  Calibrate contrast tokens       [Medium] [Tomorrow]      |                                       |
|                                                                       +---------------------------------------+
|  v ACTIVE PROJECTS & BOARDS                                           |  v WORKSPACE PULSE (Live Activity)    |
|  +---------------------------------+ +------------------------------+ |  • Sarah completed "CRW-98"     2m ago|
|  | Frontend Architecture           | | Backend Infrastructure       | |  • Alex commented on "CRW-104"  8m ago|
|  | 8/12 tasks completed (67%)      | | 15/18 tasks completed (83%)  | |  • Marcus uploaded "spec.pdf"  25m ago|
|  | [============------]            | | [==================--]       | |  • Elena created "CRW-110"      1h ago|
|  | [Avatars: Alex, Sarah, Marcus]  | | [Avatars: Tunya, Alex]       | |                                       |
|  +---------------------------------+ +------------------------------+ +---------------------------------------+
|                                                                       |  v PERSONAL MOMENTUM                  |
|  v PINNED & ESSENTIAL MODULES                                         |  Weekly Velocity: 14 completed tasks  |
|  +-------------+ +-------------+ +-------------+ +------------------+ |  [=====================>    ] +18%    |
|  | Schedules   | | Chat Rooms  | | Files & Docs| | Statistics       | |                                       |
|  | 8 upcoming  | | 3 unread    | | 24 assets   | | 94% completion   | |                                       |
|  +-------------+ +-------------+ +-------------+ +------------------+ |                                       |
+-----------------------------------------------------------------------+---------------------------------------+
```

### 3.2 Detailed Section Specifications

#### 1. Command Header (`HomeHeader.tsx`)
- **Greeting**: Dynamic, humanist time-of-day greeting (`"Good morning, <Firstname>"`, `"Good afternoon, <Firstname>"`, `"Good evening, <Firstname>"`).
- **Workspace Health Badge**: Compact status pill summarizing urgency and cadence (e.g., `"2 overdue · 3 due today"`).
- **Primary Actions**:
  - `+ New Task` button (Ember Orange primary, hotkey `C` / `N`).
  - `⌘K Search` quick trigger button (opens `OmniSearchModal`).
  - `Refresh` button with spin animation during refetching.

#### 2. My Focus & Up Next (`HomeMyFocusSection.tsx` & `HomeTaskRow.tsx`)
- **Urgency Filter Tabs**:
  - `Overdue` (accented with alert pill if count > 0)
  - `Due Today`
  - `In Progress`
- **Interactive Task Row (`HomeTaskRow.tsx`)**:
  - **Inline Completion Checkbox**: Circular button with smooth checkmark animation; optimistic update removes or marks the task complete.
  - **Priority Badge**: Distinctive iconography and subtle colored pill (`Urgent` red-orange, `High` orange, `Medium` amber, `Low` neutral).
  - **Task Title**: Clear typography with hover underline; clicking opens `TaskDetailModal`.
  - **Project / Board Breadcrumb**: Subtle clickable chip leading directly to the specific board.
  - **Due Date Pill with Quick Rescheduler (`QuickRescheduleMenu`)**: Clickable popover with 1-click options: *Today*, *Tomorrow*, *Next Week*, *Custom Date*.
  - **Metadata Indicators**: Micro badges for checklist progress (`3/5`), comment count (`💬 4`), and attachments count (`📎 2`).

#### 3. Active Projects & Boards (`HomeActiveProjectsSection.tsx`)
- Cards representing the active projects and boards in the workspace.
- **Progress Bar**: Visual percentage of completed vs. total tasks.
- **Task Counters**: Completed / total tasks.
- **Crew Stacks**: Circular avatar stacks of assignees/collaborators on that project with tooltips.
- **Direct Navigation**: Clicking any card navigates directly to that project's board.

#### 4. Pinned & Essential Modules (`HomePinnedModulesSection.tsx`)
- Grid of glass cards representing pinned modules (Schedules, Chat, Files, Statistics).
- **Live Context Badges**: Shows relevant real-time metadata (e.g., upcoming schedule count, unread message count, total files).
- **Quick Unpin Action**: Subtle unpin button visible on hover.

#### 5. Crew Presence (`HomeCrewPresenceSection.tsx`)
- Workspace member list showing name, role badge (`Owner`, `Admin`, `Member`, `Guest`).
- **Live Status Dot**: Glowing green indicator for online members, muted for offline.
- **Direct 1-Click DM**: Chat bubble icon button that instantly launches a Direct Message with that crew member.

#### 6. Live Workspace Pulse (`HomeActivityStreamSection.tsx`)
- Real-time stream of workspace events:
  - Task created / moved / completed
  - Comments added
  - Files uploaded
- Actor avatar, action description, clickable target link, and relative timestamp (`useTimeAgo`).

#### 7. Personal Momentum (`HomeVelocityCard.tsx`)
- Compact personal velocity metric displaying completed tasks in the current cycle vs. previous period with trend delta pill.

---

## 4. Shared Data Contracts (`packages/types`)

Add the following interfaces to `packages/types/src/index.ts` (or `packages/types/src/workspace.types.ts`):

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

---

## 5. Backend Architecture & Aggregated Endpoint (`apps/backend`)

### 5.1 REST Endpoint
```http
GET /workspaces/:workspaceId/home
```
- **Controller**: `WorkspaceController.getHomeData(@Param('workspaceId') workspaceId: string, @ActiveUserParam() user: ActiveUserData)`
- **Guards**: `@UseGuards(JwtAuthGuard, WsMemberGuard)`
- **Cache**: Cached via Redis `CacheService` with key `CacheKeys.workspaceHome(workspaceId, user.id)` with TTL `CacheTTL.SHORT` (120 seconds).

### 5.2 Aggregation Engine (`WorkspaceService.getHomeData`)
Performs parallel queries using `Promise.all`:
1. **User Focus Tasks**: Selects active tasks where `workspace_id = workspaceId`, `is_deleted = false`, `is_archived = false`, and `assignee_id = userId`.
   - Groups into `overdue` (`due_date < now` and column type !== `COMPLETE`), `dueToday` (`due_date` is today), and `inProgress` (column type === `ONGOING` or general active).
2. **Projects & Board Progress**: Selects workspace projects with associated boards, total task counts, completed task counts, and assigned members.
3. **Pinned Modules**: Selects `WorkspaceModule` records with `is_pinned = true`. Computes contextual badge counts (e.g., upcoming schedule count, unread room messages).
4. **Recent Activity**: Selects the top 15 most recent `TaskActivity` and notification rows for the workspace with actor and target relations.
5. **Crew Presence**: Selects workspace members (`WorkspaceMember` joined with `User`), checking online socket presence from Redis adapter / session tracker.

### 5.3 Cache Invalidation
The Redis cache key `ws:${workspaceId}:home:${userId}` is invalidated on:
- Task creation, update, move, or deletion.
- Module pin/unpin operations.
- Workspace membership changes.

---

## 6. Frontend Architecture & Component Breakdown (`apps/frontend/dash`)

### 6.1 File Organization

```
apps/frontend/dash/
├── app/[slug]/
│   ├── page.tsx                           # Server entry rendering HomeDashboard
│   └── home-dashboard.tsx                 # Client container orchestrating state & sockets
├── components/home/
│   ├── HomeHeader.tsx                     # Greeting, workspace health pill, action buttons
│   ├── HomeMyFocusSection.tsx             # Urgency tabs, task list, empty states
│   ├── HomeTaskRow.tsx                    # Interactive task row with inline completion & reschedule
│   ├── HomeActiveProjectsSection.tsx      # Project progress cards with member avatars
│   ├── HomePinnedModulesSection.tsx       # Enriched glass module cards with live stats
│   ├── HomeCrewPresenceSection.tsx        # Online member list with 1-click DM launch
│   ├── HomeActivityStreamSection.tsx      # Real-time activity timeline
│   ├── HomeVelocityCard.tsx               # Personal momentum & completion progress
│   └── HomeSkeleton.tsx                   # Matching shimmer loading placeholder
├── hooks/
│   └── use-workspace-home.ts              # TanStack Query hook with query key factory & optimistic mutations
└── services/
    └── home.service.ts                    # REST client for GET /workspaces/:workspaceId/home
```

### 6.2 TanStack Query & State Flow
- **Hook**: `useWorkspaceHome(workspaceId: string)`
- **Query Key**: `workspaceKeys.home(workspaceId)`
- **Optimistic Task Updates**:
  - `useToggleTaskComplete`: Immediately flips task status in `myFocus` arrays, plays micro-animation, and executes `boardService.updateTask`.
  - `useRescheduleTask`: Immediately updates `dueDate` in `myFocus`, closing the popover smoothly.
- **Modal Mounting**:
  - Clicking any task mounts `TaskDetailModal` dynamically without page routing, supporting full comment, checklist, and attachment interactions.
  - Clicking `+ New Task` opens the board task creation flow or quick task modal.

---

## 7. Real-Time Socket.IO Synchronization

The `HomeDashboard` attaches listeners to the singleton socket via `useWorkspaceSocket`:
- `task:created`, `task:updated`, `task:deleted`, `task:moved` -> Invalidates `workspaceKeys.home(workspaceId)` or applies optimistic cache patches.
- `activity:created` / `notification:new` -> Prepends incoming activity items to the top of `recentActivity` stream with smooth Framer Motion insertion.
- `user:status:changed` -> Updates online presence dots in the crew list in real time.

---

## 8. Keyboard Shortcuts & Accessibility (A11y)

- **Keyboard Hotkeys**:
  - `C` or `N`: Create new task.
  - `⌘K` or `Ctrl+K`: Open OmniSearch modal.
  - `Tab` / `Shift+Tab` & `Arrow Up` / `Arrow Down`: Navigate task rows.
  - `Space` / `Enter`: Toggle task completion or open task details.
- **ARIA & Semantics**:
  - Landmark tags: `<header>`, `<main>`, `<section>`, `<aside>`.
  - Proper `aria-label` attributes on status checkboxes, date pickers, and DM actions.
  - Live announcements on task completion using `useLiveAnnouncer`.
  - Full support for `prefers-reduced-motion`.

---

## 9. Testing & Verification Plan

1. **Backend Tests (`apps/backend`)**:
   - `WorkspaceService.getHomeData`: Unit tests verifying aggregation of user tasks, project progress calculations, activity collation, and caching.
   - `WorkspaceController`: E2E/integration tests verifying endpoint security, role guards, and response structure.
2. **Frontend Tests (`apps/frontend/dash`)**:
   - `HomeDashboard`: Component tests verifying rendering with full data, empty data states, and loading skeletons.
   - `HomeTaskRow`: Tests verifying inline completion click handler, reschedule menu triggers, and modal opening.
3. **Lint & Build Verification**:
   - Monorepo-wide `pnpm lint` and `pnpm build` across all packages and apps.

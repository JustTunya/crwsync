# Schedules Global Module (`/${slug}/schedules`) — Design Specification

**Roadmap item**: Milestone 5 / Workspace Productivity — Global Schedules & Deadlines Module.

## 1. Overview & Purpose

The **Schedules** module is a workspace-level global view (`/${slug}/schedules`) designed as a personal and team cockpit for tracking deadlines, due dates, and delivery cadence across all boards within a workspace.

Instead of navigating into individual boards to inspect columns and task cards, users have a unified timeline aggregating all tasks with due dates. Inspired by **Linear's "My Issues & Insights"**, it combines a grouped chronological **Agenda View** with an interactive **Mini-Calendar Navigator** and quick triage actions.

---

## 2. Guiding Principles & Scope Boundaries

1. **Leverage Existing Data (Zero Migrations)**:
   - All schedule data is derived from existing fields in `Task` (`due_date`, `assignee_id`, `created_by`, `priority`, `is_archived`, `is_deleted`, `column_id`, `workspace_id`) and associated `BoardColumn` (`type: UPCOMING | ONGOING | COMPLETE`) and `Board`.
   - No separate "Calendar Event" or "Meeting" models are introduced (YAGNI).
2. **Personal-First with Workspace Visibility**:
   - Default view is **"Assigned to Me"** to eliminate noise and give individual contributors an immediate daily focus list.
   - Toggleable to **"Created by Me"** (delegation tracking) and **"All Workspace Tasks"** (manager / team-wide tracking).
3. **Fast Inline Triage**:
   - Checkbox to mark tasks complete directly from the schedule.
   - Quick date bumper (+1 Day, Next Week, Pick Date) without opening full modals.
   - Clicking any task opens the existing, rich `TaskDetailModal` for deep edits, discussions, checklists, and attachments.
4. **Interactive Density Navigation**:
   - Mini-calendar displays activity dots for days with scheduled deadlines. Clicking a day filters/scrolls the agenda to that specific date.

---

## 3. User Experience & Layout

### 3.1 Visual Structure (Option C Hybrid)

```
+----------------------------------------------------------------------------------------------------+
| Schedules [Icon]   [ Tabs: Assigned to Me (8) | Created by Me (4) | All Tasks (24) ]     [Filter]   |
+--------------------------------------------------------------------+-------------------------------+
|  [!] 3 Overdue   [*] 4 Due Today   [-] 8 This Week   [v] 72% Done  |          March 2026           |
+--------------------------------------------------------------------+ Su  Mo  Tu  We  Th  Fr  Sa   |
| v OVERDUE (3)                                                      |  1   2   3   4   5   6   7   |
|   [ ] CRW-14 Fix WebSocket reconnect storm    [Backend / In Prog] |  8   9  10  11  12  13  14   |
|   [ ] CRW-22 Audit Redis TTL expirations       [Infra / Todo]      | 15  16  17  18  19  20  21   |
|                                                                    | 22  23  24  25  26  27  28   |
| v DUE TODAY (4)                                                    | 29  30  31                   |
|   [ ] CRW-31 Schedules module design spec      [Design / Todo]     | [•] Dates with deadlines      |
|                                                                    +-------------------------------+
| v THIS WEEK (8)                                                    | Quick Triage                  |
|   [ ] CRW-40 Implement i18n date formatters    [Frontend / Backlog]| • Reschedule Overdue to Today |
|                                                                    | • Show Completed Tasks (Off)  |
| v NO DUE DATE (12 - Collapsed by default)                          |                               |
+--------------------------------------------------------------------+-------------------------------+
```

### 3.2 Chronological Grouping Buckets
Tasks are sorted and grouped dynamically into:
- **Overdue**: `due_date < startOfToday` and status !== `COMPLETE`. Accented with subtle warning tones and relative days overdue (e.g., `2d ago`).
- **Today**: `due_date == today`. Highlighted with primary theme accents.
- **Tomorrow**: `due_date == tomorrow`.
- **This Week**: `due_date > tomorrow && due_date <= endOfWeek`.
- **Next Week**: `due_date > endOfWeek && due_date <= endOfNextWeek`.
- **Later**: `due_date > endOfNextWeek`.
- **No Due Date**: Collapsible accordion at the bottom for quick date assignment.

### 3.3 Filters & Controls
- **Scope Toggle**: `Assigned to Me` | `Created by Me` | `All Workspace`.
- **Board Filter**: Multi-select or dropdown to narrow down to specific boards.
- **Priority Filter**: Filter by `Urgent`, `High`, `Medium`, `Low`, `None`.
- **Completed Toggle**: Switch to show or hide completed tasks (defaults to hidden).
- **Date Range / Calendar Jump**: Selecting a date in the mini-calendar focuses the agenda on that specific date or resets to full view.

---

## 4. Architecture & Technical Design

### 4.1 Global Navigation Integration
Update `apps/frontend/dash/lib/sidebar.utils.ts`:
- Add `Schedules` to `getModules(slug)`:
  - Label: `"Schedules"`
  - Icon: `Calendar03Icon` (from `@hugeicons/core-free-icons`)
  - Route: `/${slug}/schedules`
  - Keyboard Shortcut: `Ctrl+3` / `Cmd+3`

### 4.2 Backend API

New endpoint in `apps/backend/src/board/board.controller.ts` (or dedicated `schedule.controller.ts`):
```http
GET /workspaces/:workspaceId/schedules
```

#### Query Parameters:
- `scope`: `"assigned_to_me"` (default) | `"created_by_me"` | `"all"`
- `boardId` (optional): `string`
- `priority` (optional): `TaskPriorityEnum`
- `includeCompleted` (optional): `boolean` (default `false`)
- `from` (optional): ISO Date string
- `to` (optional): ISO Date string

#### Query Logic:
- Authenticated user identified via `@ActiveUserParam()`.
- Verifies workspace membership via `IsMemberGuard`.
- Prisma query selects tasks where `workspace_id = :workspaceId`, `is_deleted = false`, `is_archived = false`.
- Conditional `where`:
  - `scope === 'assigned_to_me'` -> `assignee_id = user.userId`
  - `scope === 'created_by_me'` -> `created_by = user.userId`
  - `scope === 'all'` -> no user filter
  - `!includeCompleted` -> `column.type != 'COMPLETE'`
- Included relations:
  - `column`: `{ id: true, name: true, type: true, color: true, board_id: true }`
  - `column.board`: `{ id: true, name: true }`
  - `assignee`: `userPublicSelect`
  - `_count`: `{ comments: true, checklistItems: true }`
- Aggregation Metrics:
  - `counts`: `{ overdue: number, today: number, thisWeek: number, completedThisWeek: number, total: number }`

#### Fast Mutation Endpoints (Reused from existing BoardService):
- Reschedule task: `PATCH /workspaces/:workspaceId/boards/:boardId/tasks/:taskId` (`{ due_date: string | null }`)
- Complete task: `PATCH /workspaces/:workspaceId/boards/:boardId/tasks/:taskId/move` (moves task to complete column) or status toggle.

### 4.3 Frontend Data Layer & State Management

1. **Query Key Factory**:
   ```typescript
   export const scheduleKeys = {
     all: ["schedules"] as const,
     list: (workspaceId: string, filters: ScheduleFilters) =>
       [...scheduleKeys.all, workspaceId, filters] as const,
   };
   ```
2. **Real-time Synchronization**:
   - Reuses `useSocket()` from `socket.provider.tsx`.
   - Listens to standard events: `board:task:created`, `board:task:updated`, `board:task:deleted`, `board:task:moved`.
   - On task updates/moves, invalidates `scheduleKeys.all` or directly patches the cache for instant zero-latency feedback.
3. **Date Calculations**:
   - Utilizes `date-fns` (already installed: `isToday`, `isTomorrow`, `isPast`, `isThisWeek`, `formatDistanceToNow`, `startOfDay`, `endOfWeek`).

---

## 5. Frontend Component Breakdown

1. `app/[slug]/schedules/page.tsx`: Server wrapper loading metadata and initial state.
2. `app/[slug]/schedules/schedules-dashboard.tsx`: Main client shell managing active filter state, layout grid, and query subscriptions.
3. `components/schedules/SchedulesHeader.tsx`: Workspace title, scope tabs (`Assigned to Me` / `Created by Me` / `All Tasks`), filter bars, and high-level cadence metrics.
4. `components/schedules/SchedulesAgenda.tsx`: Grouped list rendering each temporal section (`OverdueSection`, `TodaySection`, `UpcomingSection`, etc.).
5. `components/schedules/ScheduleTaskRow.tsx`: Interactive task row containing:
   - Checkbox for completion.
   - Task short code (`CRW-XX`) with priority icon.
   - Title and description preview.
   - Board & column badge pills.
   - Due date indicator with overdue styling.
   - Quick date bumper dropdown menu (`Today`, `Tomorrow`, `Next Week`, `Clear`).
6. `components/schedules/SchedulesCalendarSidebar.tsx`:
   - Interactive mini-calendar based on `components/ui/calendar.tsx`.
   - Day cell decorators showing deadline dots.
   - Quick action cards (e.g. "Reschedule Overdue", "Clean up Completed").

---

## 6. Error Handling & Edge Cases

- **No due dates on tasks**: Clear empty state prompting users to assign deadlines or showing the collapsible "No Due Date" drawer.
- **Empty workspace**: Friendly empty state with illustration and shortcut to create boards/tasks.
- **Overdue task bulk action**: Graceful batching when rescheduling multiple overdue items to "Today".
- **Timezone handling**: All dates stored in UTC ISO format, formatted in user's local browser timezone via `date-fns`.

---

## 7. Testing & Quality Plan

- **Backend Unit Tests** (`board.service.spec.ts` / `schedule.service.spec.ts`):
  - Verify scoping (`assigned_to_me`, `created_by_me`, `all`).
  - Verify overdue and completed status calculations.
  - Verify workspace isolation (cannot access tasks from unauthorized workspace).
- **Frontend Unit Tests** (`schedules.test.tsx`):
  - Test date bucketing logic with mock task dates.
  - Test filter state changes (scope, board, priority, hide completed).
  - Test quick reschedule action dispatching mutation.
- **Accessibility & Keyboard Navigation**:
  - `Ctrl+3` / `Cmd+3` shortcut support.
  - Full keyboard navigability over task rows and date picker buttons.
  - High-contrast badges for overdue and urgent priority states.

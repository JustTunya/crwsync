# Schedules Global Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the workspace-wide Schedules module (`/${slug}/schedules`) with Linear-inspired personal/workspace views, chronological agenda grouping, mini-calendar navigator, and fast inline triage actions.

**Architecture:** A unified backend query aggregating tasks with due dates, relations (column, board, assignee), and summary metrics per workspace; integrated on the frontend with TanStack Query, React Day Picker, real-time Socket.IO reconciliation, and direct integration with the existing `TaskDetailModal`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js 16 (App Router), React 19, Tailwind CSS v4, Radix UI, TanStack Query v5, date-fns v4, Vitest, Jest.

**Spec:** `docs/superpowers/specs/2026-09-15-schedules-module-design.md`

## Global Constraints

- **No inline or block comments** (except short trailing magic number units).
- **Double quotes**, 2-space indentation, semicolons on statements.
- **Imports:** absolute path aliases (`@/…` in dash, `src/…` in backend, `@crwsync/types` across packages).
- **Zero Schema Migrations**: Utilize existing `Task`, `BoardColumn`, and `Board` tables.
- **Error handling**: Services return `{ success, data?, message?, errors? }` and normalize errors; hooks throw for React Query.

---

### Task 1: Shared Domain Types (`@crwsync/types`)

**Files:**
- Create: `packages/types/src/schedule.ts`
- Modify: `packages/types/src/index.ts`
- Test: `packages/types/tsconfig.json` (build/typecheck verification)

**Interfaces:**
- Produces: `ScheduleScope`, `ScheduleCounts`, `ScheduleTask`, `ScheduleFilters`, `ScheduleResponse`

- [ ] **Step 1: Write `schedule.ts` type definitions**

```typescript
import { Task, ColumnType, TaskPriorityEnum } from "./board";
import { UserPublic } from "./user";

export type ScheduleScope = "assigned_to_me" | "created_by_me" | "all";

export interface ScheduleCounts {
  overdue: number;
  today: number;
  thisWeek: number;
  completedThisWeek: number;
  total: number;
}

export interface ScheduleTask extends Task {
  column: {
    id: string;
    name: string;
    type: ColumnType;
    color: string | null;
    board_id: string;
  };
  board: {
    id: string;
    name: string;
  };
  assignee: UserPublic | null;
  _count?: {
    comments: number;
    checklistItems: number;
  };
}

export interface ScheduleFilters {
  scope?: ScheduleScope;
  boardId?: string;
  priority?: TaskPriorityEnum;
  includeCompleted?: boolean;
  from?: string;
  to?: string;
}

export interface ScheduleResponse {
  tasks: ScheduleTask[];
  counts: ScheduleCounts;
}
```

- [ ] **Step 2: Export schedule types from `packages/types/src/index.ts`**

```typescript
export * from "./schedule";
```

- [ ] **Step 3: Build and verify package types**

Run: `pnpm --filter @crwsync/types build`
Expected: PASS with `.d.ts` generated.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/schedule.ts packages/types/src/index.ts
git commit -m "feat(types): add Schedule domain types and interfaces"
```

---

### Task 2: Backend Schedule Query DTO & Unit Tests

**Files:**
- Create: `apps/backend/src/board/dto/schedule.dto.ts`
- Modify: `apps/backend/src/board/board.service.spec.ts`

**Interfaces:**
- Consumes: `ScheduleScope`, `TaskPriorityEnum` from `@crwsync/types`
- Produces: `GetSchedulesQueryDto`

- [ ] **Step 1: Write `GetSchedulesQueryDto`**

```typescript
import { IsOptional, IsEnum, IsUUID, IsBoolean, IsDateString } from "class-validator";
import { Transform } from "class-transformer";
import { TaskPriorityEnum } from "@prisma/client";

export class GetSchedulesQueryDto {
  @IsOptional()
  @IsEnum(["assigned_to_me", "created_by_me", "all"])
  scope?: "assigned_to_me" | "created_by_me" | "all" = "assigned_to_me";

  @IsOptional()
  @IsUUID("4")
  boardId?: string;

  @IsOptional()
  @IsEnum(TaskPriorityEnum)
  priority?: TaskPriorityEnum;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  includeCompleted?: boolean = false;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
```

- [ ] **Step 2: Write failing unit test in `board.service.spec.ts` for `getSchedules`**

```typescript
describe("getSchedules", () => {
  it("should return aggregated tasks and counts filtered by scope assigned_to_me", async () => {
    const mockTasks = [
      {
        id: "task-1",
        title: "Test Task",
        due_date: new Date().toISOString(),
        assignee_id: "user-1",
        column: { id: "col-1", name: "In Progress", type: "ONGOING", board_id: "board-1", board: { id: "board-1", name: "Main Board" } },
        assignee: { id: "user-1", firstname: "John", lastname: "Doe", avatar_key: null },
        _count: { comments: 0, checklistItems: 0 },
      },
    ];

    jest.spyOn(prismaService.task, "findMany").mockResolvedValue(mockTasks as any);

    const result = await service.getSchedules("ws-1", "user-1", { scope: "assigned_to_me" });

    expect(result.success).toBe(true);
    expect(result.data.tasks).toHaveLength(1);
    expect(result.data.counts).toBeDefined();
    expect(result.data.counts.total).toBe(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @crwsync/backend test board.service.spec.ts`
Expected: FAIL with `service.getSchedules is not a function`.

- [ ] **Step 4: Commit test and DTO**

```bash
git add apps/backend/src/board/dto/schedule.dto.ts apps/backend/src/board/board.service.spec.ts
git commit -m "test(backend): add test for getSchedules service method"
```

---

### Task 3: Backend Service Implementation & Controller Route

**Files:**
- Modify: `apps/backend/src/board/board.service.ts`
- Modify: `apps/backend/src/board/board.controller.ts`
- Test: `apps/backend/src/board/board.service.spec.ts`

**Interfaces:**
- Consumes: `GetSchedulesQueryDto`
- Produces: `GET /workspaces/:workspaceId/boards/schedules` endpoint returning `{ success: true, data: ScheduleResponse }`

- [ ] **Step 1: Implement `getSchedules` in `board.service.ts`**

```typescript
async getSchedules(workspaceId: string, userId: string, query: GetSchedulesQueryDto) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  const where: Prisma.TaskWhereInput = {
    workspace_id: workspaceId,
    is_deleted: false,
    is_archived: false,
  };

  if (query.scope === "assigned_to_me" || !query.scope) {
    where.assignee_id = userId;
  } else if (query.scope === "created_by_me") {
    where.created_by = userId;
  }

  if (query.boardId) {
    where.column = { board_id: query.boardId };
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (!query.includeCompleted) {
    where.column = {
      ...(where.column || {}),
      type: { not: "COMPLETE" },
    };
  }

  if (query.from || query.to) {
    where.due_date = {};
    if (query.from) where.due_date.gte = new Date(query.from);
    if (query.to) where.due_date.lte = new Date(query.to);
  }

  const tasks = await this.prisma.task.findMany({
    where,
    select: {
      id: true,
      shortId: true,
      column_id: true,
      title: true,
      description: true,
      priority: true,
      labels: true,
      tags: true,
      assignee_id: true,
      due_date: true,
      position: true,
      is_deleted: true,
      is_archived: true,
      in_progress_at: true,
      completed_at: true,
      created_by: true,
      created_at: true,
      updated_at: true,
      column: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          board_id: true,
          board: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          username: true,
          firstname: true,
          lastname: true,
          avatar_key: true,
        },
      },
      _count: {
        select: {
          comments: true,
          checklistItems: true,
        },
      },
    },
    orderBy: [
      { due_date: "asc" },
      { priority: "desc" },
    ],
  });

  const formattedTasks = tasks.map((t) => ({
    ...t,
    board: t.column.board,
  }));

  let overdue = 0;
  let today = 0;
  let thisWeek = 0;
  let completedThisWeek = 0;

  for (const task of formattedTasks) {
    if (task.column.type === "COMPLETE") {
      if (task.completed_at && new Date(task.completed_at) >= startOfToday) {
        completedThisWeek++;
      }
      continue;
    }

    if (task.due_date) {
      const d = new Date(task.due_date);
      if (d < startOfToday) {
        overdue++;
      } else if (d.toDateString() === startOfToday.toDateString()) {
        today++;
      } else if (d <= endOfWeek) {
        thisWeek++;
      }
    }
  }

  return {
    success: true,
    data: {
      tasks: formattedTasks,
      counts: {
        overdue,
        today,
        thisWeek,
        completedThisWeek,
        total: formattedTasks.length,
      },
    },
  };
}
```

- [ ] **Step 2: Add `@Get("schedules")` endpoint to `board.controller.ts`**

```typescript
@Get("schedules")
getSchedules(
  @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
  workspaceId: string,
  @ActiveUserParam() user: ActiveUser,
  @Query() query: GetSchedulesQueryDto,
) {
  return this.boardService.getSchedules(workspaceId, user.userId, query);
}
```

- [ ] **Step 3: Run backend unit tests**

Run: `pnpm --filter @crwsync/backend test`
Expected: PASS for all tests.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/board/board.service.ts apps/backend/src/board/board.controller.ts
git commit -m "feat(backend): implement getSchedules endpoint and service logic"
```

---

### Task 4: Frontend Schedule Service & TanStack Query Hook

**Files:**
- Create: `apps/frontend/dash/services/schedule.service.ts`
- Modify: `apps/frontend/dash/hooks/query-keys.ts`
- Create: `apps/frontend/dash/hooks/use-schedules.ts`
- Create: `apps/frontend/dash/hooks/__tests__/use-schedules.test.ts`

**Interfaces:**
- Consumes: `ScheduleResponse`, `ScheduleFilters` from `@crwsync/types`
- Produces: `useSchedules(workspaceId, filters)` hook

- [ ] **Step 1: Write `scheduleKeys` in `apps/frontend/dash/hooks/query-keys.ts`**

```typescript
export const scheduleKeys = {
  all: ["schedules"] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...scheduleKeys.all, "list", workspaceId, filters || {}] as const,
};
```

- [ ] **Step 2: Write `schedule.service.ts`**

```typescript
import { isAxiosError } from "axios";
import { api } from "@/services/auth.service";
import { ScheduleResponse, ScheduleFilters, WorkspaceOperationState } from "@crwsync/types";

export async function getSchedules(
  workspaceId: string,
  filters?: ScheduleFilters
): Promise<WorkspaceOperationState<ScheduleResponse>> {
  try {
    const response = await api.get<WorkspaceOperationState<ScheduleResponse>>(
      `/workspaces/${workspaceId}/boards/schedules`,
      { params: filters }
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Failed to fetch schedules");
    }
    throw new Error("An unexpected error occurred");
  }
}
```

- [ ] **Step 3: Write `use-schedules.ts` hook**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { ScheduleFilters } from "@crwsync/types";
import { getSchedules } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/query-keys";

export function useSchedules(workspaceId?: string, filters?: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleKeys.list(workspaceId || "unknown", filters),
    queryFn: () => getSchedules(workspaceId!, filters),
    enabled: !!workspaceId,
    select: (res) => res.data,
    staleTime: 1000 * 60 * 2,
  });
}
```

- [ ] **Step 4: Write unit test in `apps/frontend/dash/hooks/__tests__/use-schedules.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { scheduleKeys } from "@/hooks/query-keys";

describe("scheduleKeys", () => {
  it("should generate consistent hierarchical keys", () => {
    const key = scheduleKeys.list("ws-123", { scope: "assigned_to_me" });
    expect(key).toEqual(["schedules", "list", "ws-123", { scope: "assigned_to_me" }]);
  });
});
```

- [ ] **Step 5: Run tests to verify**

Run: `pnpm --filter @crwsync/dash test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/services/schedule.service.ts apps/frontend/dash/hooks/query-keys.ts apps/frontend/dash/hooks/use-schedules.ts apps/frontend/dash/hooks/__tests__/use-schedules.test.ts
git commit -m "feat(dash): add schedule service and TanStack query hook"
```

---

### Task 5: Global Sidebar Navigation Integration

**Files:**
- Modify: `apps/frontend/dash/lib/sidebar.utils.ts`
- Modify: `apps/frontend/dash/components/l-sidebar.tsx`
- Test: `apps/frontend/dash/lib/__tests__/sidebar.utils.test.ts`

**Interfaces:**
- Produces: Schedules entry in global modules list with `Calendar04Icon`, route `/${slug}/schedules`, and `Ctrl+3` shortcut.

- [ ] **Step 1: Write test for `getModules` with Schedules**

```typescript
import { describe, it, expect } from "vitest";
import { getModules } from "../sidebar.utils";

describe("getModules", () => {
  it("should include Home, Statistics, and Schedules", () => {
    const modules = getModules("demo-slug");
    expect(modules).toHaveLength(3);
    expect(modules[2]).toMatchObject({
      name: "Schedules",
      href: "/demo-slug/schedules",
      shortcut: ["ctrl", "3"],
    });
  });
});
```

- [ ] **Step 2: Update `getModules` in `sidebar.utils.ts`**

```typescript
import { Home03Icon, Activity01Icon, Calendar04Icon } from "@hugeicons/core-free-icons";

export function getModules(slug: string) {
  return [
    {
      name: "Home",
      icon: Home03Icon,
      href: `/${slug}`,
      shortcut: ["ctrl", "1"],
    },
    {
      name: "Statistics",
      icon: Activity01Icon,
      href: `/${slug}/statistics`,
      shortcut: ["ctrl", "2"],
    },
    {
      name: "Schedules",
      icon: Calendar04Icon,
      href: `/${slug}/schedules`,
      shortcut: ["ctrl", "3"],
    },
  ];
}
```

- [ ] **Step 3: Wire `Ctrl+3` shortcut in `l-sidebar.tsx`**

```typescript
useHotkey("ctrl+3", () => {
  if (slug) router.push(`/${slug}/schedules`);
});
```

- [ ] **Step 4: Run tests to verify**

Run: `pnpm --filter @crwsync/dash test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/lib/sidebar.utils.ts apps/frontend/dash/components/l-sidebar.tsx apps/frontend/dash/lib/__tests__/sidebar.utils.test.ts
git commit -m "feat(dash): add Schedules module to global sidebar navigation"
```

---

### Task 6: Interactive Task Row & Quick Date Bumper

**Files:**
- Create: `apps/frontend/dash/components/schedules/QuickRescheduleMenu.tsx`
- Create: `apps/frontend/dash/components/schedules/ScheduleTaskRow.tsx`

**Interfaces:**
- Consumes: `ScheduleTask`, `useUpdateTask`, `useBoard`
- Produces: `ScheduleTaskRow` component with inline complete toggle, date bumper menu, and detail click handler.

- [ ] **Step 1: Write `QuickRescheduleMenu.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar04Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { addDays, nextMonday, startOfDay } from "date-fns";

interface QuickRescheduleMenuProps {
  currentDueDate: string | null;
  onReschedule: (newDate: string | null) => void;
}

export function QuickRescheduleMenu({ currentDueDate, onReschedule }: QuickRescheduleMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelectPreset = (daysOffset: number) => {
    const target = addDays(startOfDay(new Date()), daysOffset);
    onReschedule(target.toISOString());
    setOpen(false);
  };

  const handleNextWeek = () => {
    const target = nextMonday(startOfDay(new Date()));
    onReschedule(target.toISOString());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
          <HugeiconsIcon icon={Calendar04Icon} className="size-3.5 mr-1" />
          <span>{currentDueDate ? new Date(currentDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Set Date"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="flex flex-col gap-1 mb-2 border-b border-border/50 pb-2 text-xs">
          <button onClick={() => handleSelectPreset(0)} className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium">
            Today
          </button>
          <button onClick={() => handleSelectPreset(1)} className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium">
            Tomorrow
          </button>
          <button onClick={handleNextWeek} className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium">
            Next Week
          </button>
          {currentDueDate && (
            <button onClick={() => { onReschedule(null); setOpen(false); }} className="text-left px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive font-medium">
              Remove Due Date
            </button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={currentDueDate ? new Date(currentDueDate) : undefined}
          onSelect={(date) => {
            if (date) onReschedule(date.toISOString());
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Write `ScheduleTaskRow.tsx`**

```tsx
"use client";

import React from "react";
import { ScheduleTask, TaskPriorityEnum } from "@crwsync/types";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickRescheduleMenu } from "./QuickRescheduleMenu";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Message01Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { isPast, isToday, startOfDay } from "date-fns";

interface ScheduleTaskRowProps {
  task: ScheduleTask;
  workspaceId: string;
  onSelectTask: (task: ScheduleTask) => void;
  onUpdateDueDate: (taskId: string, boardId: string, dueDate: string | null) => void;
  onToggleComplete: (task: ScheduleTask) => void;
}

const PRIORITY_COLOR: Record<TaskPriorityEnum, string> = {
  [TaskPriorityEnum.URGENT]: "text-red-500",
  [TaskPriorityEnum.HIGH]: "text-amber-500",
  [TaskPriorityEnum.MEDIUM]: "text-blue-500",
  [TaskPriorityEnum.LOW]: "text-zinc-400",
  [TaskPriorityEnum.NONE]: "text-transparent",
};

export function ScheduleTaskRow({
  task,
  workspaceId,
  onSelectTask,
  onUpdateDueDate,
  onToggleComplete,
}: ScheduleTaskRowProps) {
  const isComplete = task.column.type === "COMPLETE";
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isComplete;

  return (
    <div className={cn(
      "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all",
      isComplete && "opacity-60 bg-muted/10",
      isOverdue && "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Checkbox
          checked={isComplete}
          onCheckedChange={() => onToggleComplete(task)}
          className="size-4 rounded-sm data-[state=checked]:bg-primary"
        />

        <span className="text-xs font-mono text-muted-foreground shrink-0">{task.shortId}</span>

        {task.priority !== TaskPriorityEnum.NONE && (
          <span className={cn("size-2 rounded-full shrink-0", PRIORITY_COLOR[task.priority])} />
        )}

        <button
          onClick={() => onSelectTask(task)}
          className={cn(
            "text-sm font-medium text-left truncate hover:underline",
            isComplete && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </button>

        <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground shrink-0 font-medium">
          {task.board.name} • {task.column.name}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task._count && task._count.comments > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Message01Icon} className="size-3.5" />
            {task._count.comments}
          </span>
        )}

        <QuickRescheduleMenu
          currentDueDate={task.due_date}
          onReschedule={(newDate) => onUpdateDueDate(task.id, task.column.board_id, newDate)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/dash/components/schedules/QuickRescheduleMenu.tsx apps/frontend/dash/components/schedules/ScheduleTaskRow.tsx
git commit -m "feat(dash): add ScheduleTaskRow and QuickRescheduleMenu components"
```

---

### Task 7: Mini-Calendar Navigator & Metrics Sidebar

**Files:**
- Create: `apps/frontend/dash/components/schedules/SchedulesCalendarSidebar.tsx`

**Interfaces:**
- Consumes: `ScheduleTask[]`, `ScheduleCounts`
- Produces: `SchedulesCalendarSidebar` with density indicators and quick triage actions.

- [ ] **Step 1: Implement `SchedulesCalendarSidebar.tsx`**

```tsx
"use client";

import React from "react";
import { ScheduleTask, ScheduleCounts } from "@crwsync/types";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSameDay } from "date-fns";

interface SchedulesCalendarSidebarProps {
  tasks: ScheduleTask[];
  counts: ScheduleCounts;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onRescheduleOverdueToToday: () => void;
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
}

export function SchedulesCalendarSidebar({
  tasks,
  counts,
  selectedDate,
  onSelectDate,
  onRescheduleOverdueToToday,
  showCompleted,
  onToggleShowCompleted,
}: SchedulesCalendarSidebarProps) {
  const datesWithTasks = tasks.filter((t) => t.due_date).map((t) => new Date(t.due_date!));

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-4">
      <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-xs">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={(date) => onSelectDate(date || null)}
          modifiers={{
            hasDeadline: (date) => datesWithTasks.some((d) => isSameDay(d, date)),
          }}
          modifiersClassNames={{
            hasDeadline: "font-bold text-primary underline decoration-primary/50 underline-offset-4",
          }}
          className="rounded-md"
        />

        {selectedDate && (
          <div className="mt-2 pt-2 border-t border-border/40 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Filtering by date</span>
            <Button variant="ghost" size="sm" onClick={() => onSelectDate(null)} className="h-6 text-xs px-2">
              Clear date filter
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-xs flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Triage</h4>

        {counts.overdue > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRescheduleOverdueToToday}
            className="w-full justify-start text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            Reschedule {counts.overdue} overdue to Today
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleShowCompleted}
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
        >
          {showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
        </Button>
      </Card>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/dash/components/schedules/SchedulesCalendarSidebar.tsx
git commit -m "feat(dash): add SchedulesCalendarSidebar component with density indicators"
```

---

### Task 8: Schedules Agenda Grouped List & Header

**Files:**
- Create: `apps/frontend/dash/components/schedules/SchedulesHeader.tsx`
- Create: `apps/frontend/dash/components/schedules/SchedulesAgenda.tsx`

**Interfaces:**
- Consumes: `ScheduleTask[]`, `ScheduleCounts`, `ScheduleFilters`, `ScheduleTaskRow`
- Produces: `SchedulesHeader` and `SchedulesAgenda` with temporal bucket grouping.

- [ ] **Step 1: Implement `SchedulesHeader.tsx`**

```tsx
"use client";

import React from "react";
import { ScheduleScope, ScheduleCounts, TaskPriorityEnum } from "@crwsync/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar04Icon, AlertCircleIcon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

interface SchedulesHeaderProps {
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  priority: TaskPriorityEnum | undefined;
  onPriorityChange: (priority: TaskPriorityEnum | undefined) => void;
  counts: ScheduleCounts;
}

export function SchedulesHeader({
  scope,
  onScopeChange,
  priority,
  onPriorityChange,
  counts,
}: SchedulesHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HugeiconsIcon icon={Calendar04Icon} className="size-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Schedules</h1>
        </div>

        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg border border-border/40">
          <Button
            variant={scope === "assigned_to_me" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onScopeChange("assigned_to_me")}
            className="text-xs h-7 px-3"
          >
            Assigned to Me
          </Button>
          <Button
            variant={scope === "created_by_me" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onScopeChange("created_by_me")}
            className="text-xs h-7 px-3"
          >
            Created by Me
          </Button>
          <Button
            variant={scope === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onScopeChange("all")}
            className="text-xs h-7 px-3"
          >
            All Tasks
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          {counts.overdue > 0 && (
            <span className="flex items-center gap-1.5 text-red-500 font-medium px-2 py-0.5 rounded-full bg-red-500/10">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-3.5" />
              {counts.overdue} Overdue
            </span>
          )}
          <span className="text-muted-foreground font-medium">
            {counts.today} Due Today
          </span>
          <span className="text-muted-foreground">
            {counts.thisWeek} This Week
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={priority || "ALL"}
            onValueChange={(val) => onPriorityChange(val === "ALL" ? undefined : (val as TaskPriorityEnum))}
          >
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value={TaskPriorityEnum.URGENT}>Urgent</SelectItem>
              <SelectItem value={TaskPriorityEnum.HIGH}>High</SelectItem>
              <SelectItem value={TaskPriorityEnum.MEDIUM}>Medium</SelectItem>
              <SelectItem value={TaskPriorityEnum.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `SchedulesAgenda.tsx`**

```tsx
"use client";

import React, { useMemo, useState } from "react";
import { ScheduleTask } from "@crwsync/types";
import { ScheduleTaskRow } from "./ScheduleTaskRow";
import { isPast, isToday, isTomorrow, isThisWeek, isSameDay, startOfDay } from "date-fns";

interface SchedulesAgendaProps {
  tasks: ScheduleTask[];
  workspaceId: string;
  selectedDate: Date | null;
  onSelectTask: (task: ScheduleTask) => void;
  onUpdateDueDate: (taskId: string, boardId: string, dueDate: string | null) => void;
  onToggleComplete: (task: ScheduleTask) => void;
}

export function SchedulesAgenda({
  tasks,
  workspaceId,
  selectedDate,
  onSelectTask,
  onUpdateDueDate,
  onToggleComplete,
}: SchedulesAgendaProps) {
  const [noDateOpen, setNoDateOpen] = useState(false);

  const buckets = useMemo(() => {
    if (selectedDate) {
      return {
        customDate: tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), selectedDate)),
        overdue: [],
        today: [],
        tomorrow: [],
        thisWeek: [],
        later: [],
        noDate: [],
      };
    }

    const startToday = startOfDay(new Date());

    const result = {
      customDate: [] as ScheduleTask[],
      overdue: [] as ScheduleTask[],
      today: [] as ScheduleTask[],
      tomorrow: [] as ScheduleTask[],
      thisWeek: [] as ScheduleTask[],
      later: [] as ScheduleTask[],
      noDate: [] as ScheduleTask[],
    };

    for (const task of tasks) {
      if (!task.due_date) {
        result.noDate.push(task);
        continue;
      }

      const d = new Date(task.due_date);
      const isComplete = task.column.type === "COMPLETE";

      if (!isComplete && isPast(d) && !isToday(d)) {
        result.overdue.push(task);
      } else if (isToday(d)) {
        result.today.push(task);
      } else if (isTomorrow(d)) {
        result.tomorrow.push(task);
      } else if (isThisWeek(d)) {
        result.thisWeek.push(task);
      } else {
        result.later.push(task);
      }
    }

    return result;
  }, [tasks, selectedDate]);

  const renderSection = (title: string, items: ScheduleTask[], variant?: "overdue" | "today" | "default") => {
    if (items.length === 0) return null;

    return (
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          <span className={variant === "overdue" ? "text-red-500 font-bold" : variant === "today" ? "text-primary font-bold" : ""}>
            {title} ({items.length})
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {items.map((task) => (
            <ScheduleTaskRow
              key={task.id}
              task={task}
              workspaceId={workspaceId}
              onSelectTask={onSelectTask}
              onUpdateDueDate={onUpdateDueDate}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {selectedDate && renderSection(`Deadlines for ${selectedDate.toLocaleDateString()}`, buckets.customDate)}
      {!selectedDate && (
        <>
          {renderSection("Overdue", buckets.overdue, "overdue")}
          {renderSection("Due Today", buckets.today, "today")}
          {renderSection("Tomorrow", buckets.tomorrow)}
          {renderSection("This Week", buckets.thisWeek)}
          {renderSection("Later", buckets.later)}

          {buckets.noDate.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <button
                onClick={() => setNoDateOpen(!noDateOpen)}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground mb-3 flex items-center gap-1.5"
              >
                No Due Date ({buckets.noDate.length}) {noDateOpen ? "▲" : "▼"}
              </button>
              {noDateOpen && (
                <div className="flex flex-col gap-1.5">
                  {buckets.noDate.map((task) => (
                    <ScheduleTaskRow
                      key={task.id}
                      task={task}
                      workspaceId={workspaceId}
                      onSelectTask={onSelectTask}
                      onUpdateDueDate={onUpdateDueDate}
                      onToggleComplete={onToggleComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/dash/components/schedules/SchedulesHeader.tsx apps/frontend/dash/components/schedules/SchedulesAgenda.tsx
git commit -m "feat(dash): add SchedulesHeader and SchedulesAgenda components"
```

---

### Task 9: Page Route & Layout Integration

**Files:**
- Create: `apps/frontend/dash/app/[slug]/schedules/page.tsx`
- Create: `apps/frontend/dash/app/[slug]/schedules/schedules-dashboard.tsx`

**Interfaces:**
- Consumes: `useSchedules`, `useUpdateTask`, `useBoardSocket`, `TaskDetailModal`
- Produces: Full dashboard page accessible at `/${slug}/schedules`

- [ ] **Step 1: Write `schedules-dashboard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { ScheduleTask, ScheduleScope, TaskPriorityEnum } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { useSchedules } from "@/hooks/use-schedules";
import { useUpdateTask } from "@/hooks/use-boards";
import { useQueryClient } from "@tanstack/react-query";
import { scheduleKeys } from "@/hooks/query-keys";
import { SchedulesHeader } from "@/components/schedules/SchedulesHeader";
import { SchedulesAgenda } from "@/components/schedules/SchedulesAgenda";
import { SchedulesCalendarSidebar } from "@/components/schedules/SchedulesCalendarSidebar";
import { TaskDetailModal } from "@/components/kanban/TaskDetailModal";

export function SchedulesDashboard() {
  const { activeId: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<ScheduleScope>("assigned_to_me");
  const [priority, setPriority] = useState<TaskPriorityEnum | undefined>();
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTask, setActiveTask] = useState<ScheduleTask | null>(null);

  const { data: scheduleData, isLoading } = useSchedules(workspaceId, {
    scope,
    priority,
    includeCompleted: showCompleted,
  });

  const updateTask = useUpdateTask(workspaceId || "", activeTask?.column.board_id || "");

  const handleUpdateDueDate = (taskId: string, boardId: string, dueDate: string | null) => {
    updateTask.mutate(
      { taskId, data: { due_date: dueDate } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
        },
      }
    );
  };

  const handleToggleComplete = (task: ScheduleTask) => {
    const isComplete = task.column.type === "COMPLETE";
    updateTask.mutate(
      { taskId: task.id, data: { completed_at: isComplete ? null : new Date().toISOString() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
        },
      }
    );
  };

  const handleRescheduleOverdueToToday = () => {
    const overdueTasks = scheduleData?.tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date()) || [];
    const todayIso = new Date().toISOString();

    for (const task of overdueTasks) {
      updateTask.mutate({ taskId: task.id, data: { due_date: todayIso } });
    }
    queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SchedulesHeader
        scope={scope}
        onScopeChange={setScope}
        priority={priority}
        onPriorityChange={setPriority}
        counts={scheduleData?.counts || { overdue: 0, today: 0, thisWeek: 0, completedThisWeek: 0, total: 0 }}
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <SchedulesAgenda
          tasks={scheduleData?.tasks || []}
          workspaceId={workspaceId || ""}
          selectedDate={selectedDate}
          onSelectTask={(task) => setActiveTask(task)}
          onUpdateDueDate={handleUpdateDueDate}
          onToggleComplete={handleToggleComplete}
        />

        <SchedulesCalendarSidebar
          tasks={scheduleData?.tasks || []}
          counts={scheduleData?.counts || { overdue: 0, today: 0, thisWeek: 0, completedThisWeek: 0, total: 0 }}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onRescheduleOverdueToToday={handleRescheduleOverdueToToday}
          showCompleted={showCompleted}
          onToggleShowCompleted={() => setShowCompleted(!showCompleted)}
        />
      </div>

      {activeTask && (
        <TaskDetailModal
          taskId={activeTask.id}
          columnId={activeTask.column_id}
          boardId={activeTask.column.board_id}
          workspaceId={workspaceId || ""}
          onClose={() => {
            setActiveTask(null);
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `page.tsx`**

```tsx
import React from "react";
import { SchedulesDashboard } from "./schedules-dashboard";

export const metadata = {
  title: "Schedules | crwsync",
  description: "Unified workspace schedules, deadlines, and delivery cockpit",
};

export default function SchedulesPage() {
  return <SchedulesDashboard />;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/dash/app/[slug]/schedules/page.tsx apps/frontend/dash/app/[slug]/schedules/schedules-dashboard.tsx
git commit -m "feat(dash): add Schedules page route and dashboard container"
```

---

### Task 10: End-to-End Verification & Quality Pass

**Files:**
- Test: whole repo tests and linting

- [ ] **Step 1: Run typecheck across all workspaces**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 2: Run linter across all workspaces**

Run: `pnpm lint`
Expected: PASS with 0 warnings/errors.

- [ ] **Step 3: Run all test suites**

Run: `pnpm test`
Expected: PASS for backend and dash.

- [ ] **Step 4: Commit any final cleanup**

```bash
git commit --allow-empty -m "chore: complete Schedules module implementation and verification"
```

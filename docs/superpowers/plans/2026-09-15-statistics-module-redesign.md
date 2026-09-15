# Statistics & Analytics Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-craft, Linear-grade Statistics & Analytics module featuring Team Overview, Personal Productivity Insights (with a 52-week activity contribution heatmap), and Project/Board Health Scorecards, backed by a dedicated NestJS aggregation service and Redis caching.

**Architecture:** A dedicated `StatisticsModule` in the NestJS backend aggregates task, board, activity, and member workload metrics with period-over-period delta calculations. The frontend dashboard in `apps/frontend/dash` consumes the API via TanStack Query and URL-synced tab/interval state, rendering interactive Recharts visualizations, SVG heatmaps, and metric cards styled according to `DESIGN.md`.

**Tech Stack:** NestJS, Prisma, Redis (`CacheService`), Next.js 16 (App Router), React 19, TanStack Query v5, Recharts, Framer Motion, `@hugeicons/react`, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-09-15-statistics-module-redesign.md`

## Global Constraints
- Double quotes, 2-space indentation, semicolons on statements.
- Path aliases: `@/…` in `apps/frontend/dash`, `@crwsync/types` across the workspace.
- No comments explaining what code does (names and structure carry intent).
- Strictly adhere to `DESIGN.md` tokens (`primary` `oklch(0.703 0.188 36.91)`, `card`, `border`, `base-200`, `base-300`, `success`, `alert`, `error`, `info`).
- Numeric values must use `tabular-nums` typography.

---

### Task 1: Define Shared Statistics Types in `@crwsync/types`

**Files:**
- Create: `packages/types/src/statistics.ts`
- Modify: `packages/types/src/index.ts:1-15`

**Interfaces:**
- Produces: `StatisticsInterval`, `StatisticsTab`, `MetricDelta`, `StatisticsTimeseriesPoint`, `MemberWorkloadStat`, `ActivityHeatmapDay`, `BoardStatBreakdown`, `ProjectStatBreakdown`, `WorkspaceStatisticsData`, `StatisticsQueryParams`.

- [ ] **Step 1: Create `packages/types/src/statistics.ts`**

```typescript
export type StatisticsInterval =
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "6m"
  | "1y"
  | "all";

export type StatisticsTab = "overview" | "personal" | "projects";

export interface MetricDelta {
  current: number;
  previous: number;
  deltaPercent: number | null;
  trend: "up" | "down" | "neutral";
  sentiment: "positive" | "negative" | "neutral";
}

export interface StatisticsTimeseriesPoint {
  date: string;
  label: string;
  created: number;
  completed: number;
}

export interface MemberWorkloadStat {
  userId: string;
  name: string;
  username: string;
  avatarKey: string | null;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  avgCycleTimeSeconds: number | null;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
  level: number; // 0 to 4
}

export interface BoardStatBreakdown {
  boardId: string;
  boardName: string;
  totalTasks: number;
  completedTasks: number;
  upcomingTasks: number;
  ongoingTasks: number;
  completionRate: number;
  avgCycleTimeSeconds: number | null;
}

export interface ProjectStatBreakdown {
  projectId: string;
  projectName: string;
  color: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  boards: BoardStatBreakdown[];
}

export interface WorkspaceStatisticsData {
  interval: StatisticsInterval;
  summary: {
    velocity: MetricDelta;
    created: MetricDelta;
    throughputRatio: MetricDelta;
    cycleTimeSeconds: MetricDelta;
    overdueTasks: MetricDelta;
    completionRate: MetricDelta;
  };
  timeseries: StatisticsTimeseriesPoint[];
  memberWorkloads: MemberWorkloadStat[];
  priorityDistribution: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  statusDistribution: {
    upcoming: number;
    ongoing: number;
    complete: number;
  };
  personal: {
    activeWorkload: number;
    velocity: MetricDelta;
    cycleTimeSeconds: MetricDelta;
    onTimeRate: MetricDelta;
    activityHeatmap: ActivityHeatmapDay[];
    streakDays: number;
    totalActiveDays: number;
  };
  projects: ProjectStatBreakdown[];
}

export interface StatisticsQueryParams {
  interval?: StatisticsInterval;
  projectId?: string;
  boardId?: string;
}
```

- [ ] **Step 2: Export statistics types from `packages/types/src/index.ts`**

Modify `packages/types/src/index.ts` to add `export * from "./statistics";`.

- [ ] **Step 3: Verify packages typecheck**

Run: `pnpm --filter @crwsync/types build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/statistics.ts packages/types/src/index.ts
git commit -m "feat(types): add shared statistics data types and query contracts"
```

---

### Task 2: Implement Backend `StatisticsService` and Unit Tests

**Files:**
- Create: `apps/backend/src/statistics/statistics.service.ts`
- Create: `apps/backend/src/statistics/statistics.service.spec.ts`
- Create: `apps/backend/src/statistics/dto/statistics.dto.ts`

**Interfaces:**
- Consumes: `PrismaService`, `CacheService`, `WorkspaceStatisticsData` from `@crwsync/types`
- Produces: `StatisticsService.getWorkspaceStatistics(workspaceId: string, userId: string, query: StatisticsQueryDto): Promise<WorkspaceStatisticsData>`

- [ ] **Step 1: Write `apps/backend/src/statistics/dto/statistics.dto.ts`**

```typescript
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { type StatisticsInterval } from "@crwsync/types";

export class StatisticsQueryDto {
  @IsOptional()
  @IsEnum(["7d", "14d", "30d", "90d", "6m", "1y", "all"])
  interval?: StatisticsInterval = "30d";

  @IsOptional()
  @IsUUID("4")
  projectId?: string;

  @IsOptional()
  @IsUUID("4")
  boardId?: string;
}
```

- [ ] **Step 2: Write failing unit test in `apps/backend/src/statistics/statistics.service.spec.ts`**

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { StatisticsService } from "./statistics.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis/cache.service";

describe("StatisticsService", () => {
  let service: StatisticsService;
  let prisma: any;
  let cache: any;

  const mockWorkspaceId = "11111111-1111-1111-1111-111111111111";
  const mockUserId = "22222222-2222-2222-2222-222222222222";

  beforeEach(async () => {
    prisma = {
      task: {
        count: vi.fn().mockResolvedValue(10),
        findMany: vi.fn().mockResolvedValue([]),
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([
          {
            user: {
              id: mockUserId,
              firstname: "Alice",
              lastname: "Smith",
              username: "alice",
              avatar_key: null,
            },
          },
        ]),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      taskActivity: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };

    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  it("calculates metric delta with positive sentiment correctly", () => {
    const delta = service.calculateDelta(15, 10, "positive");
    expect(delta.current).toBe(15);
    expect(delta.previous).toBe(10);
    expect(delta.deltaPercent).toBe(50);
    expect(delta.trend).toBe("up");
    expect(delta.sentiment).toBe("positive");
  });

  it("calculates cycle time delta with inverse sentiment correctly", () => {
    const delta = service.calculateDelta(100, 200, "inverse");
    expect(delta.current).toBe(100);
    expect(delta.previous).toBe(200);
    expect(delta.deltaPercent).toBe(-50);
    expect(delta.trend).toBe("down");
    expect(delta.sentiment).toBe("positive");
  });

  it("returns comprehensive statistics object with expected shape", async () => {
    const result = await service.getWorkspaceStatistics(mockWorkspaceId, mockUserId, {
      interval: "30d",
    });

    expect(result).toHaveProperty("interval", "30d");
    expect(result).toHaveProperty("summary");
    expect(result.summary).toHaveProperty("velocity");
    expect(result.summary).toHaveProperty("cycleTimeSeconds");
    expect(result).toHaveProperty("timeseries");
    expect(result).toHaveProperty("memberWorkloads");
    expect(result).toHaveProperty("priorityDistribution");
    expect(result).toHaveProperty("statusDistribution");
    expect(result).toHaveProperty("personal");
    expect(result.personal).toHaveProperty("activityHeatmap");
    expect(result).toHaveProperty("projects");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @crwsync/backend test src/statistics/statistics.service.spec.ts`
Expected: FAIL ("Cannot find module './statistics.service'")

- [ ] **Step 4: Implement `apps/backend/src/statistics/statistics.service.ts`**

Implement `StatisticsService` with:
- `calculateDelta(current: number, previous: number, direction: "positive" | "inverse"): MetricDelta`
- Date interval parser: `7d` (7 days), `14d` (14 days), `30d` (30 days), `90d` (90 days), `6m` (180 days), `1y` (365 days), `all` (730 days).
- Previous period computation: $[T_{\text{start}} - \Delta, T_{\text{start}}]$.
- Parallel Prisma aggregation queries for velocity, created count, throughput ratio, cycle time extraction, overdue tasks, priority breakdown, status breakdown, member workload aggregation, personal activity heatmap (grouping 365 days of task completion/activities), and project/board breakdowns.
- Redis caching via `CacheService` with key `ws:${workspaceId}:statistics:${interval}:${projectId || "all"}:${boardId || "all"}:${userId}` and 300s TTL.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @crwsync/backend test src/statistics/statistics.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/statistics/statistics.service.ts apps/backend/src/statistics/statistics.service.spec.ts apps/backend/src/statistics/dto/statistics.dto.ts
git commit -m "feat(backend): implement StatisticsService aggregation engine with tests"
```

---

### Task 3: Create `StatisticsController`, `StatisticsModule`, and Register in `AppModule`

**Files:**
- Create: `apps/backend/src/statistics/statistics.controller.ts`
- Create: `apps/backend/src/statistics/statistics.module.ts`
- Modify: `apps/backend/src/app.module.ts:1-60`
- Modify: `apps/backend/src/workspace/workspace.controller.ts:198-208` (delegate or deprecate old endpoint)

**Interfaces:**
- Produces: `GET /workspaces/:workspaceId/statistics` endpoint protected by `JwtAuthGuard`, `IsMemberGuard`, and `WorkspaceRolesGuard`.

- [ ] **Step 1: Create `apps/backend/src/statistics/statistics.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/interfaces/active-user.interface";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { WorkspaceRolesGuard } from "src/workspace/guards/ws-roles.guard";
import { StatisticsService } from "./statistics.service";
import { StatisticsQueryDto } from "./dto/statistics.dto";

@Controller("workspaces/:workspaceId/statistics")
@UseGuards(JwtAuthGuard, IsMemberGuard, WorkspaceRolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @SkipThrottle()
  getWorkspaceStatistics(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Query() query: StatisticsQueryDto,
  ) {
    return this.statisticsService.getWorkspaceStatistics(
      workspaceId,
      user.userId,
      query,
    );
  }
}
```

- [ ] **Step 2: Create `apps/backend/src/statistics/statistics.module.ts`**

```typescript
import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { RedisModule } from "src/redis/redis.module";
import { StatisticsController } from "./statistics.controller";
import { StatisticsService } from "./statistics.service";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
```

- [ ] **Step 3: Register `StatisticsModule` in `apps/backend/src/app.module.ts`**

Import `StatisticsModule` and add to `@Module({ imports: [..., StatisticsModule] })`.
In `apps/backend/src/workspace/workspace.controller.ts`, remove redundant `@Get(":workspaceId/statistics")` to avoid routing collision, routing through `StatisticsController`.

- [ ] **Step 4: Verify backend typecheck and build**

Run: `pnpm --filter @crwsync/backend build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/statistics/statistics.controller.ts apps/backend/src/statistics/statistics.module.ts apps/backend/src/app.module.ts apps/backend/src/workspace/workspace.controller.ts
git commit -m "feat(backend): wire StatisticsModule and StatisticsController in AppModule"
```

---

### Task 4: Frontend Service & TanStack Query Hook with Tests

**Files:**
- Modify: `apps/frontend/dash/services/statistics.service.ts`
- Modify: `apps/frontend/dash/hooks/use-statistics.ts`
- Create: `apps/frontend/dash/hooks/__tests__/use-statistics.test.ts`

**Interfaces:**
- Consumes: `@crwsync/types`
- Produces: `getWorkspaceStatistics(workspaceId, params)`, `useStatistics(workspaceId, params)`

- [ ] **Step 1: Write test in `apps/frontend/dash/hooks/__tests__/use-statistics.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { statisticsKeys } from "../use-statistics";

describe("statisticsKeys", () => {
  it("generates correct query key with all parameters", () => {
    const key = statisticsKeys.detail("ws-123", {
      interval: "30d",
      projectId: "proj-456",
      boardId: "board-789",
    });

    expect(key).toEqual([
      "statistics",
      "ws-123",
      { interval: "30d", projectId: "proj-456", boardId: "board-789" },
    ]);
  });
});
```

- [ ] **Step 2: Update `apps/frontend/dash/services/statistics.service.ts`**

```typescript
import { isAxiosError } from "axios";
import { api } from "@/services/auth.service";
import type {
  WorkspaceStatisticsData,
  StatisticsQueryParams,
} from "@crwsync/types";

export async function getWorkspaceStatistics(
  workspaceId: string,
  params?: StatisticsQueryParams
): Promise<WorkspaceStatisticsData> {
  try {
    const response = await api.get<WorkspaceStatisticsData>(
      `/workspaces/${workspaceId}/statistics`,
      { params }
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch workspace statistics"
      );
    }
    throw new Error("An unexpected error occurred");
  }
}
```

- [ ] **Step 3: Update `apps/frontend/dash/hooks/use-statistics.ts`**

```typescript
"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getWorkspaceStatistics } from "@/services/statistics.service";
import type { StatisticsQueryParams } from "@crwsync/types";

export const statisticsKeys = {
  all: ["statistics"] as const,
  detail: (workspaceId: string, params?: StatisticsQueryParams) =>
    [...statisticsKeys.all, workspaceId, params ?? {}] as const,
};

export function useStatistics(
  workspaceId?: string,
  params?: StatisticsQueryParams
) {
  return useQuery({
    queryKey: statisticsKeys.detail(workspaceId || "unknown", params),
    queryFn: () => getWorkspaceStatistics(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 4: Run frontend tests**

Run: `pnpm --filter @crwsync/dash test hooks/__tests__/use-statistics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/services/statistics.service.ts apps/frontend/dash/hooks/use-statistics.ts apps/frontend/dash/hooks/__tests__/use-statistics.test.ts
git commit -m "feat(dash): update statistics service and TanStack Query hook with test coverage"
```

---

### Task 5: Build Reusable UI Atoms & Cards (`MetricDeltaBadge`, `StatisticsHeader`, Charts)

**Files:**
- Create: `apps/frontend/dash/components/statistics/MetricDeltaBadge.tsx`
- Create: `apps/frontend/dash/components/statistics/StatisticsHeader.tsx`
- Create: `apps/frontend/dash/components/statistics/ThroughputChart.tsx`
- Create: `apps/frontend/dash/components/statistics/MemberWorkloadTable.tsx`
- Create: `apps/frontend/dash/components/statistics/PriorityDistributionCard.tsx`
- Create: `apps/frontend/dash/components/statistics/StatusFlowCard.tsx`
- Create: `apps/frontend/dash/components/statistics/ActivityHeatmap.tsx`

**Interfaces:**
- Produces: Visual components following `DESIGN.md` design system with `Figtree` typography, `framer-motion` animations, Recharts, and accessible colors.

- [ ] **Step 1: Create `MetricDeltaBadge.tsx`**

Implement delta percentage badge supporting up/down arrows, neutral badges, and positive/negative/neutral color states (`bg-success/15 text-success`, `bg-error/15 text-error`, `bg-muted text-muted-foreground`).

- [ ] **Step 2: Create `StatisticsHeader.tsx`**

Implement header with:
- Module title & `Analytics01Icon` / `Chart01Icon` from `@hugeicons/core-free-icons`.
- Segmented control for Tabs (`Overview`, `My Insights`, `Projects & Boards`).
- Interval pill selector (`7D`, `14D`, `30D`, `90D`, `6M`, `1Y`, `All`).
- Project / Board filter dropdown.
- Refresh trigger.

- [ ] **Step 3: Create `ThroughputChart.tsx`**

Dual-series Recharts Area/Bar chart (Tasks Created vs. Tasks Completed) with custom theme gradient fills (`oklch(0.703 0.188 36.91)` and `oklch(0.72 0.18 245)`), responsive container, custom HTML tooltip with tabular figures, and empty state.

- [ ] **Step 4: Create `MemberWorkloadTable.tsx`**

Team allocation table rendering member avatars (`UserAvatar`), name, active tasks progress bar, completed count, overdue count badge, and average cycle time.

- [ ] **Step 5: Create `PriorityDistributionCard.tsx` & `StatusFlowCard.tsx`**

Distribution visual cards for Priority (`Urgent`, `High`, `Medium`, `Low`, `None`) and State Flow (`Upcoming` $\rightarrow$ `Ongoing` $\rightarrow$ `Complete`) using brand semantic colors.

- [ ] **Step 6: Create `ActivityHeatmap.tsx`**

GitHub/Linear-style 52-week horizontal calendar SVG grid with month labels, day labels, 5 intensity levels using crwsync primary color alpha scale, interactive tooltips, and streak stats.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/dash/components/statistics/
git commit -m "feat(dash): add statistics UI components (header, charts, table, heatmap)"
```

---

### Task 6: Build Tab Views (`Overview`, `Personal`, `Projects`) & Assemble `StatisticsDashboard`

**Files:**
- Create: `apps/frontend/dash/components/statistics/StatisticsOverviewTab.tsx`
- Create: `apps/frontend/dash/components/statistics/StatisticsPersonalTab.tsx`
- Create: `apps/frontend/dash/components/statistics/StatisticsProjectsTab.tsx`
- Modify: `apps/frontend/dash/app/[slug]/statistics/statistics-dashboard.tsx`
- Modify: `apps/frontend/dash/app/[slug]/statistics/page.tsx`

**Interfaces:**
- Produces: Complete Linear-level Statistics dashboard with smooth tab switching, URL sync, skeleton loading states, and error boundaries.

- [ ] **Step 1: Create `StatisticsOverviewTab.tsx`**

Assemble 4 summary KPI cards (Velocity, Throughput Ratio, Avg Cycle Time, On-Time Rate), `ThroughputChart`, `MemberWorkloadTable`, and distribution cards in a responsive grid.

- [ ] **Step 2: Create `StatisticsPersonalTab.tsx`**

Assemble personal KPI cards, `ActivityHeatmap`, personal focus metrics, and upcoming deadlines risk radar.

- [ ] **Step 3: Create `StatisticsProjectsTab.tsx`**

Assemble project health scorecards with board completion meters, velocity benchmarks, and direct links to Kanban boards.

- [ ] **Step 4: Update `apps/frontend/dash/app/[slug]/statistics/statistics-dashboard.tsx`**

Refactor `StatisticsDashboard` to integrate the header, URL state management for `tab`, `interval`, `projectId`, `boardId`, tab routing via `framer-motion` `AnimatePresence`, and skeleton loading states.

- [ ] **Step 5: Verify dashboard build & lint**

Run: `pnpm --filter @crwsync/dash build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/components/statistics/ apps/frontend/dash/app/[slug]/statistics/
git commit -m "feat(dash): assemble Linear-grade Statistics dashboard with tabbed views"
```

---

### Task 7: Full Monorepo Typecheck, Lint & Integration Verification

**Files:**
- All touched files

- [ ] **Step 1: Run typecheck across entire monorepo**

Run: `pnpm typecheck`
Expected: PASS across all packages (`backend`, `dash`, `web`, `types`, `i18n`, `styles`)

- [ ] **Step 2: Run linter across entire monorepo**

Run: `pnpm lint`
Expected: PASS with no ESLint errors

- [ ] **Step 3: Run backend and frontend unit test suites**

Run: `pnpm --filter @crwsync/backend test && pnpm --filter @crwsync/dash test`
Expected: All tests PASS

- [ ] **Step 4: Final commit and verify git status**

```bash
git status
```

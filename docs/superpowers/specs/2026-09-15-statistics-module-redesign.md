# Design Specification: Statistics & Analytics Module Redesign

## 1. Overview & Vision
The current Statistics page in crwsync provides only basic metrics (3 stat cards and a single area chart). This redesign transforms Statistics into a Linear-grade, high-craft analytics workspace. It equips team leads and individual contributors with actionable delivery metrics, velocity trends, team workload distribution, GitHub/Linear-style contribution heatmaps, and project-by-project health scorecards.

---

## 2. Core Perspectives & Tab Architecture

The module is structured into three primary tabs:

### Tab 1: Overview (Team Delivery & Health)
* **High-Level Metric Cards (with period-over-period delta badges):**
  * **Completed Tasks / Velocity**: Total tasks completed in the period with percentage delta vs. previous period.
  * **Throughput Ratio (Created vs. Completed)**: Net flow of tasks into vs. out of the workspace.
  * **Average Cycle Time**: Mean duration from `in_progress_at` to `completed_at` (lower is better; green indicator on drop).
  * **On-Time Delivery Rate**: Percentage of tasks completed before their `due_date`, with overdue count chip.
* **Throughput & Velocity Trend Chart:**
  * Area & Line chart showing daily/weekly tasks created vs. tasks completed with gradient fills matching crwsync brand tokens (`oklch(0.703 0.188 36.91)`), interactive tooltip, and custom cursor.
* **Team Workload & Capacity Allocation:**
  * Member leaderboard/table displaying user avatar, name, active tasks in progress, completed tasks, overdue tasks, and capacity status.
* **Distribution Breakdowns:**
  * **Priority Distribution**: Urgent, High, Medium, Low, None with semantic color badges.
  * **Workflow State Flow**: Upcoming $\rightarrow$ Ongoing $\rightarrow$ Complete distribution.
  * **Bottleneck Radar**: Stagnant tasks in progress $> 7$ days or overdue items.

### Tab 2: My Insights (Personal Productivity)
* **Personal KPI Cards**: Personal velocity, personal cycle time, personal focus on-time rate, and active workload.
* **Activity & Contribution Heatmap (`ActivityHeatmap`):**
  * 52-week horizontal calendar grid showing daily activity intensity (task completions, task creations, status updates, comments).
  * 5 intensity levels using primary color alpha steps.
  * Rich tooltip detailing activities on each day, current active streak, and total active days.
* **Personal Velocity by Priority & Upcoming Deadlines:**
  * Completion speed breakdown and timeline of upcoming tasks with due dates.

### Tab 3: Projects & Boards (Scope & Milestones)
* **Project Health Scorecards:**
  * Project-level aggregation with custom project colors, total boards, total tasks, and overall progress meters.
* **Board Health & Sprint Breakdown:**
  * Per-board completion rate, open backlog, active throughput, and average cycle time.
  * Direct action link to jump to the respective Kanban board.

---

## 3. Data Contracts & Shared Types

### Shared Types (`packages/types/src/statistics.ts` & exported via `packages/types/src/index.ts`)

```typescript
export type StatisticsInterval = "7d" | "14d" | "30d" | "90d" | "6m" | "1y" | "all";
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
```

---

## 4. Backend Architecture

### Dedicated `StatisticsModule` (`apps/backend/src/statistics/`)
* **`StatisticsController` (`apps/backend/src/statistics/statistics.controller.ts`)**:
  * Endpoint: `GET /workspaces/:workspaceId/statistics`
  * Query parameters:
    * `interval` (default `"30d"`): `"7d" | "14d" | "30d" | "90d" | "6m" | "1y" | "all"`
    * `projectId` (optional UUID): Filter metrics to a specific project
    * `boardId` (optional UUID): Filter metrics to a specific board
  * Guards: `JwtAuthGuard`, `IsMemberGuard`, `WorkspaceRolesGuard` with `@SkipThrottle()`
* **`StatisticsService` (`apps/backend/src/statistics/statistics.service.ts`)**:
  * Aggregates metrics using Prisma transactions / raw SQL for optimal performance.
  * Calculates current interval $[T_0, T_1]$ and prior comparative interval $[T_{-1}, T_0]$.
  * Builds daily timeseries buckets, per-member task counts, priority and status counts, and the personal contribution heatmap.
  * Caching with Redis `CacheService` (5 min TTL) keyed by workspace, interval, and filter parameters.

---

## 5. Frontend Architecture & UI Components

### Directory: `apps/frontend/dash/components/statistics/`
* **`StatisticsHeader.tsx`**:
  * Module title, completed tasks counter pill, tab switcher segmented control (`Overview`, `My Insights`, `Projects & Boards`), time range selector (`7D`, `14D`, `30D`, `90D`, `6M`, `1Y`, `All`), project/board filter dropdown, and refresh button.
* **`StatisticsOverviewTab.tsx`**:
  * 4 KPI summary cards with `MetricDeltaBadge` (delta %, arrow indicator, positive/negative color coding).
  * `ThroughputChart.tsx`: Recharts responsive dual Area/Bar chart for tasks created vs. completed.
  * `MemberWorkloadTable.tsx`: Team workload balance with avatar, active/done bars, and overdue indicator.
  * `PriorityDistributionCard.tsx` & `StatusFlowCard.tsx`: Donut / progress bars for task distributions.
* **`StatisticsPersonalTab.tsx`**:
  * Personal metrics summary.
  * `ActivityHeatmap.tsx`: 52-week SVG/Grid contribution heatmap with month labels, day labels, intensity gradients, and hover popover.
  * Focus breakdown and personal completion velocity.
* **`StatisticsProjectsTab.tsx`**:
  * Grid of project cards with board completion meters, velocity benchmarks, and quick navigation buttons.
* **`MetricDeltaBadge.tsx`**:
  * Reusable badge for $+X\%$ / $-X\%$ trends with semantic green/red coloring based on metric type (e.g. cycle time reduction is positive).

---

## 6. Visual System & Craftsmanship
* **Typography**: `Figtree` font with `tabular-nums` for all numbers and percentages.
* **Color System**: Strictly adheres to `DESIGN.md` tokens:
  * Primary: `oklch(0.703 0.188 36.91)`
  * Surfaces: `card` (`oklch(0.98 0.008 64.35)` light / dark counterpart)
  * Borders: `border` / `base-200` / `base-300`
  * Status Colors: `success` (`oklch(0.75 0.18 145)`), `alert` (`oklch(0.84 0.18 50)`), `error` (`oklch(0.72 0.18 25)`), `info` (`oklch(0.72 0.18 245)`).
* **Animations**: Framer Motion staggered entrance animations (`staggerChildren: 0.06`), spring damping on hover, and smooth tab switching.
* **Responsiveness**: Fluid layout with responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), horizontal scroll handling for charts and heatmap on mobile screens.

---

## 7. Testing & Quality Verification Plan
1. **Backend Unit Tests**:
   * `apps/backend/src/statistics/statistics.service.spec.ts`: Test delta percentage calculation, period division, cycle time extraction, personal activity heatmap generation, and project filtering.
2. **Frontend Unit Tests**:
   * `apps/frontend/dash/hooks/__tests__/use-statistics.test.ts`: Verify query key factories, parameter handling, and data transformation.
3. **Workspace Build & Lint**:
   * `pnpm typecheck` and `pnpm lint` across all packages.

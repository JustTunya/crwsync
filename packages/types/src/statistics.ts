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
  level: number;
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

"use client";

import type { WorkspaceStatisticsData } from "@crwsync/types";
import { Card } from "@/components/ui/card";
import { MetricDeltaBadge } from "./MetricDeltaBadge";
import { ThroughputChart } from "./ThroughputChart";
import { MemberWorkloadTable } from "./MemberWorkloadTable";
import { PriorityDistributionCard } from "./PriorityDistributionCard";
import { StatusFlowCard } from "./StatusFlowCard";
import { cn } from "@/lib/utils";

export interface StatisticsOverviewTabProps {
  data?: WorkspaceStatisticsData;
  isLoading?: boolean;
}

function formatCycleTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const totalSeconds = Math.round(seconds);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    return `${m}m`;
  }
  if (totalSeconds < 86400) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function StatisticsOverviewTab({
  data,
  isLoading,
}: StatisticsOverviewTabProps) {
  const summary = data?.summary;

  return (
    <div data-testid="statistics-overview-tab" className="@container space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-3">
        {/* Card 1: Completed Velocity */}
        <Card
          data-testid="kpi-velocity"
          className="flex flex-col gap-1.5 p-3.5 rounded-lg border-border bg-card"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Completed tasks
            </span>
            <MetricDeltaBadge delta={summary?.velocity} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {isLoading ? "—" : summary?.velocity.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">tasks</span>
          </div>
          <p className="text-xs text-muted-foreground">
            vs. {summary?.velocity.previous ?? 0} in previous period
          </p>
        </Card>

        {/* Card 2: Created Tasks */}
        <Card
          data-testid="kpi-created"
          className="flex flex-col gap-1.5 p-3.5 rounded-lg border-border bg-card"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Created tasks
            </span>
            <MetricDeltaBadge delta={summary?.created} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {isLoading ? "—" : summary?.created.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">tasks</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ratio: {summary?.throughputRatio.current ?? 0}x throughput
          </p>
        </Card>

        {/* Card 3: Avg Cycle Time */}
        <Card
          data-testid="kpi-cycle-time"
          className="flex flex-col gap-1.5 p-3.5 rounded-lg border-border bg-card"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Avg. cycle time
            </span>
            <MetricDeltaBadge delta={summary?.cycleTimeSeconds} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {isLoading
                ? "—"
                : formatCycleTime(summary?.cycleTimeSeconds.current ?? null)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Start to completion duration
          </p>
        </Card>

        {/* Card 4: Overdue & Delivery */}
        <Card
          data-testid="kpi-overdue"
          className="flex flex-col gap-1.5 p-3.5 rounded-lg border-border bg-card"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Overdue tasks
            </span>
            <MetricDeltaBadge delta={summary?.overdueTasks} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight",
                (summary?.overdueTasks.current ?? 0) > 0
                  ? "text-error"
                  : "text-foreground"
              )}
            >
              {isLoading ? "—" : summary?.overdueTasks.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">tasks</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Completion rate: {summary?.completionRate.current ?? 0}%
          </p>
        </Card>
      </div>

      {/* Main Throughput Chart */}
      <ThroughputChart
        timeseries={data?.timeseries}
        isLoading={isLoading}
      />

      {/* Member Workload Leaderboard */}
      <MemberWorkloadTable
        workloads={data?.memberWorkloads}
        isLoading={isLoading}
      />

      {/* Distribution Matrices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PriorityDistributionCard
          priorityDistribution={data?.priorityDistribution}
        />
        <StatusFlowCard
          statusDistribution={data?.statusDistribution}
        />
      </div>
    </div>
  );
}

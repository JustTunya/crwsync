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
    <div data-testid="statistics-overview-tab" className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completed Velocity */}
        <Card
          data-testid="kpi-velocity"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Completed Tasks
            </span>
            <MetricDeltaBadge delta={summary?.velocity} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {isLoading ? "—" : summary?.velocity.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              tasks
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            vs. {summary?.velocity.previous ?? 0} in previous period
          </p>
        </Card>

        {/* Card 2: Created Tasks */}
        <Card
          data-testid="kpi-created"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Created Tasks
            </span>
            <MetricDeltaBadge delta={summary?.created} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {isLoading ? "—" : summary?.created.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              tasks
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ratio: {summary?.throughputRatio.current ?? 0}x throughput
          </p>
        </Card>

        {/* Card 3: Avg Cycle Time */}
        <Card
          data-testid="kpi-cycle-time"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Cycle Time
            </span>
            <MetricDeltaBadge delta={summary?.cycleTimeSeconds} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {isLoading
                ? "—"
                : formatCycleTime(summary?.cycleTimeSeconds.current ?? null)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Start to completion duration
          </p>
        </Card>

        {/* Card 4: Overdue & Delivery */}
        <Card
          data-testid="kpi-overdue"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Overdue Tasks
            </span>
            <MetricDeltaBadge delta={summary?.overdueTasks} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-3xl font-bold tabular-nums tracking-tight",
                (summary?.overdueTasks.current ?? 0) > 0
                  ? "text-error"
                  : "text-foreground"
              )}
            >
              {isLoading ? "—" : summary?.overdueTasks.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              tasks
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Completion Rate: {summary?.completionRate.current ?? 0}%
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

"use client";

import type { WorkspaceStatisticsData } from "@crwsync/types";
import { Card } from "@/components/ui/card";
import { MetricDeltaBadge } from "./MetricDeltaBadge";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { cn } from "@/lib/utils";

export interface StatisticsPersonalTabProps {
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

export function StatisticsPersonalTab({
  data,
  isLoading,
}: StatisticsPersonalTabProps) {
  const personal = data?.personal;

  return (
    <div data-testid="statistics-personal-tab" className="space-y-6">
      {/* 4 Personal KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Workload */}
        <Card
          data-testid="personal-kpi-workload"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Workload
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {isLoading ? "—" : personal?.activeWorkload ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              in-progress
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Tasks currently in progress
          </p>
        </Card>

        {/* Card 2: Personal Velocity */}
        <Card
          data-testid="personal-kpi-velocity"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              My Velocity
            </span>
            <MetricDeltaBadge delta={personal?.velocity} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {isLoading ? "—" : personal?.velocity.current ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              completed
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            vs. {personal?.velocity.previous ?? 0} in previous period
          </p>
        </Card>

        {/* Card 3: Personal Avg Cycle Time */}
        <Card
          data-testid="personal-kpi-cycle-time"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              My Avg. Cycle Time
            </span>
            <MetricDeltaBadge delta={personal?.cycleTimeSeconds} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {isLoading
                ? "—"
                : formatCycleTime(personal?.cycleTimeSeconds.current ?? null)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Average time to complete assigned tasks
          </p>
        </Card>

        {/* Card 4: On-Time Delivery Rate */}
        <Card
          data-testid="personal-kpi-on-time"
          className="flex flex-col justify-between p-5 rounded-2xl border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              On-Time Rate
            </span>
            <MetricDeltaBadge delta={personal?.onTimeRate} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-3xl font-bold tabular-nums tracking-tight",
                (personal?.onTimeRate.current ?? 100) >= 90
                  ? "text-success"
                  : (personal?.onTimeRate.current ?? 100) >= 70
                    ? "text-warning"
                    : "text-error"
              )}
            >
              {isLoading ? "—" : `${personal?.onTimeRate.current ?? 100}%`}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Delivered before scheduled due date
          </p>
        </Card>
      </div>

      {/* 52-Week GitHub/Linear-Style Contribution Heatmap */}
      <ActivityHeatmap
        heatmap={personal?.activityHeatmap}
        streakDays={personal?.streakDays}
        totalActiveDays={personal?.totalActiveDays}
      />
    </div>
  );
}

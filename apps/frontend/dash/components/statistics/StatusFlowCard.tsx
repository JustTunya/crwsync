"use client";

import type { WorkspaceStatisticsData } from "@crwsync/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatusFlowCardProps {
  statusDistribution?: WorkspaceStatisticsData["statusDistribution"];
  className?: string;
}

const STATUS_KEYS: Array<{
  key: keyof WorkspaceStatisticsData["statusDistribution"];
  label: string;
  dot: string;
  bar: string;
  textColor: string;
}> = [
  {
    key: "upcoming",
    label: "Upcoming",
    dot: "bg-muted-foreground",
    bar: "bg-muted-foreground/70",
    textColor: "text-muted-foreground",
  },
  {
    key: "ongoing",
    label: "In Progress",
    dot: "bg-primary",
    bar: "bg-primary",
    textColor: "text-primary",
  },
  {
    key: "complete",
    label: "Complete",
    dot: "bg-success",
    bar: "bg-success",
    textColor: "text-success",
  },
];

export function StatusFlowCard({
  statusDistribution,
  className,
}: StatusFlowCardProps) {
  const distribution = statusDistribution ?? {
    upcoming: 0,
    ongoing: 0,
    complete: 0,
  };

  const total =
    distribution.upcoming + distribution.ongoing + distribution.complete;

  return (
    <Card
      data-testid="status-flow-card"
      className={cn(
        "flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm",
        className
      )}
    >
      <CardHeader className="p-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Workflow State Flow
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total} active tasks across Kanban stages
        </p>
      </CardHeader>

      <CardContent className="p-0 flex flex-col gap-4">
        {/* Stacked Flow Bar */}
        <div className="h-3 w-full rounded-full bg-muted/70 overflow-hidden flex">
          {STATUS_KEYS.map((s) => {
            const count = distribution[s.key] ?? 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            if (percent === 0) return null;

            return (
              <div
                key={s.key}
                style={{ width: `${percent}%` }}
                className={cn("h-full transition-all duration-500", s.bar)}
                title={`${s.label}: ${count} (${Math.round(percent)}%)`}
              />
            );
          })}
        </div>

        {/* Legend & Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {STATUS_KEYS.map((s) => {
            const count = distribution[s.key] ?? 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={s.key}
                className="flex flex-col p-2.5 rounded-xl border border-border/70 bg-muted/20"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={cn("size-2 rounded-full shrink-0", s.dot)}
                  />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {s.label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {count}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

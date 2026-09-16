"use client";

import type { WorkspaceStatisticsData } from "@crwsync/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PriorityDistributionCardProps {
  priorityDistribution?: WorkspaceStatisticsData["priorityDistribution"];
  className?: string;
}

const PRIORITY_KEYS: Array<{
  key: keyof WorkspaceStatisticsData["priorityDistribution"];
  label: string;
  dot: string;
  bar: string;
}> = [
  { key: "urgent", label: "Urgent", dot: "bg-error", bar: "bg-error" },
  { key: "high", label: "High", dot: "bg-alert", bar: "bg-alert" },
  { key: "medium", label: "Medium", dot: "bg-warning", bar: "bg-warning" },
  { key: "low", label: "Low", dot: "bg-info", bar: "bg-info" },
  { key: "none", label: "None", dot: "bg-muted-foreground", bar: "bg-muted-foreground" },
];

export function PriorityDistributionCard({
  priorityDistribution,
  className,
}: PriorityDistributionCardProps) {
  const distribution = priorityDistribution ?? {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };

  const total =
    distribution.urgent +
    distribution.high +
    distribution.medium +
    distribution.low +
    distribution.none;

  const maxCount = Math.max(
    1,
    distribution.urgent,
    distribution.high,
    distribution.medium,
    distribution.low,
    distribution.none
  );

  return (
    <Card
      data-testid="priority-distribution-card"
      className={cn("flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm", className)}
    >
      <CardHeader className="p-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Priority Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total} tasks across workspace priorities
        </p>
      </CardHeader>

      <CardContent className="p-0 flex flex-col gap-3">
        {PRIORITY_KEYS.map((p) => {
          const count = distribution[p.key] ?? 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={p.key} className="flex items-center gap-3">
              <span className={cn("size-2.5 rounded-full shrink-0", p.dot)} />
              <span className="w-14 text-xs font-medium text-muted-foreground">
                {p.label}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-muted/70 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", p.bar)}
                  style={{
                    width: `${count > 0 ? Math.max(6, (count / maxCount) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs font-semibold tabular-nums text-foreground">
                {count}
              </span>
              <span className="w-10 text-right text-[11px] font-mono text-muted-foreground">
                {percent}%
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

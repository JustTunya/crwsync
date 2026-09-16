"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Analytics01Icon } from "@hugeicons/core-free-icons";
import { WorkspaceHomeSummary } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { cn } from "@/lib/utils";

export interface HomeVelocityCardProps {
  summary?: WorkspaceHomeSummary;
  className?: string;
}

export function HomeVelocityCard({ summary, className }: HomeVelocityCardProps) {
  return (
    <GlassBox className={cn("w-full! mx-0! p-4 flex flex-col gap-3", className)}>
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <HugeiconsIcon icon={Analytics01Icon} className="size-4 text-primary" />
        Personal Momentum
      </h2>

      <div className="flex flex-col gap-0.5">
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {summary?.completionVelocity ?? 0}
        </span>
        <span className="text-xs text-muted-foreground font-medium">completed in current cycle</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-base-200/60">
        <span>Active Workload</span>
        <span className="font-semibold text-foreground">{summary?.activeTasksCount ?? 0} tasks</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Urgent Deadlines</span>
        <span className={cn("font-semibold", (summary?.urgentCount ?? 0) > 0 ? "text-alert" : "text-foreground")}>
          {summary?.urgentCount ?? 0} due
        </span>
      </div>
    </GlassBox>
  );
}

"use client";

import { useMemo } from "react";
import type { MemberWorkloadStat } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MemberWorkloadTableProps {
  workloads?: MemberWorkloadStat[];
  isLoading?: boolean;
  className?: string;
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

export function MemberWorkloadTable({
  workloads = [],
  isLoading,
  className,
}: MemberWorkloadTableProps) {
  const maxActiveTasks = useMemo(() => {
    let max = 1;
    for (const w of workloads) {
      if (w.activeTasks > max) max = w.activeTasks;
    }
    return max;
  }, [workloads]);

  return (
    <Card
      data-testid="member-workload-table"
      className={cn("flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm", className)}
    >
      <CardHeader className="p-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Team Workload & Output
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Task distribution, throughput, and cycle times across workspace members
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-xl bg-muted/60"
              />
            ))}
          </div>
        ) : workloads.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 font-medium">Member</th>
                  <th className="pb-2.5 font-medium min-w-36">Active Tasks</th>
                  <th className="pb-2.5 font-medium text-center">Completed</th>
                  <th className="pb-2.5 font-medium text-center">Overdue</th>
                  <th className="pb-2.5 font-medium text-right">Avg. Cycle Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {workloads.map((member) => {
                  const activePercent = Math.min(
                    100,
                    Math.round((member.activeTasks / maxActiveTasks) * 100)
                  );

                  return (
                    <tr
                      key={member.userId}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5 min-w-40">
                          <UserAvatar
                            size={7}
                            user={{
                              name: member.name,
                              avatar_key: member.avatarKey,
                            }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                              @{member.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold tabular-nums text-foreground w-5 text-right">
                            {member.activeTasks}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted/70 overflow-hidden max-w-28">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${activePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold tabular-nums text-foreground">
                          {member.completedTasks}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {member.overdueTasks > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-error/15 text-error border border-error/30 tabular-nums">
                            {member.overdueTasks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 font-mono text-[11px]">
                            0
                          </span>
                        )}
                      </td>

                      <td className="py-3 pl-3 text-right">
                        <span className="font-semibold tabular-nums text-foreground font-mono">
                          {formatCycleTime(member.avgCycleTimeSeconds)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground">
              No member workload data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

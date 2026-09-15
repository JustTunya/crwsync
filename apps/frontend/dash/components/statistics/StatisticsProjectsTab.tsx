"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  KanbanIcon,
  ArrowRight01Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import type { ProjectStatBreakdown } from "@crwsync/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface StatisticsProjectsTabProps {
  projects?: ProjectStatBreakdown[];
  slug?: string;
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

export function StatisticsProjectsTab({
  projects = [],
  slug = "",
  isLoading,
}: StatisticsProjectsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 w-full animate-pulse rounded-2xl bg-muted/60"
          />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        data-testid="projects-tab-empty"
        className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-muted/20 text-center"
      >
        <HugeiconsIcon
          icon={Folder01Icon}
          strokeWidth={1.5}
          className="size-8 text-muted-foreground/60 mb-2"
        />
        <h3 className="text-sm font-semibold text-foreground">
          No projects or boards found
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Create projects and boards to track delivery milestones and health scorecards.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="statistics-projects-tab" className="space-y-6">
      {projects.map((proj) => {
        return (
          <Card
            key={proj.projectId}
            data-testid={`project-scorecard-${proj.projectId}`}
            className="flex flex-col gap-5 p-5 rounded-2xl border-border bg-card shadow-sm"
          >
            <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: proj.color || "var(--color-primary)",
                  }}
                />
                <div>
                  <CardTitle className="text-base font-semibold text-card-foreground">
                    {proj.projectName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {proj.boards.length} {proj.boards.length === 1 ? "board" : "boards"} • {proj.totalTasks} total tasks
                  </p>
                </div>
              </div>

              {/* Progress pill */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {proj.completedTasks} / {proj.totalTasks} completed
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {proj.completionRate}% completion rate
                  </span>
                </div>
                <div className="w-24 h-2 rounded-full bg-muted/70 overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${proj.completionRate}%` }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {proj.boards.map((board) => (
                  <div
                    key={board.boardId}
                    data-testid={`board-card-${board.boardId}`}
                    className="flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <HugeiconsIcon
                            icon={KanbanIcon}
                            strokeWidth={2}
                            className="size-4 text-primary shrink-0"
                          />
                          <span className="font-semibold text-xs text-foreground truncate">
                            {board.boardName}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold tabular-nums text-foreground">
                          {board.completionRate}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${board.completionRate}%` }}
                        />
                      </div>

                      {/* Board Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium py-1.5 rounded-lg bg-background/60 border border-border/40">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            Upcoming
                          </span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {board.upcomingTasks}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            Ongoing
                          </span>
                          <span className="font-semibold tabular-nums text-primary">
                            {board.ongoingTasks}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            Done
                          </span>
                          <span className="font-semibold tabular-nums text-success">
                            {board.completedTasks}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 text-xs">
                      <span className="text-muted-foreground text-[11px]">
                        Avg. Cycle: {formatCycleTime(board.avgCycleTimeSeconds)}
                      </span>
                      {slug && (
                        <Link
                          href={`/${slug}/board/${board.boardId}`}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-hover text-[11px] transition-colors"
                        >
                          <span>Open Board</span>
                          <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            strokeWidth={2.5}
                            className="size-3 group-hover:translate-x-0.5 transition-transform"
                          />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

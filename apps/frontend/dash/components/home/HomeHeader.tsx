"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Search01Icon,
  RotateRight01Icon,
} from "@hugeicons/core-free-icons";
import { WorkspaceHomeSummary } from "@crwsync/types";
import { LSidebarToggle } from "@/components/l-sidebar";
import { RSidebarToggle } from "@/components/r-sidebar";
import { cn } from "@/lib/utils";

export interface HomeHeaderProps {
  summary?: WorkspaceHomeSummary;
  isRefetching?: boolean;
  onRefresh?: () => void;
  onNewTask?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}

export function HomeHeader({
  summary,
  isRefetching,
  onRefresh,
  onNewTask,
  onOpenSearch,
  className,
}: HomeHeaderProps) {
  const urgentCount = summary?.urgentCount ?? 0;
  const isUrgent = urgentCount > 0;

  return (
    <div
      data-testid="home-header"
      className={cn(
        "flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200 shrink-0 bg-card/40 backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <LSidebarToggle />

        <div className="flex flex-col min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">
            {summary?.greeting || "Home"}
          </h1>
          {summary?.todayFormatted && (
            <span className="text-xs text-muted-foreground truncate">
              {summary.todayFormatted}
            </span>
          )}
        </div>

        {summary && (
          <span
            data-testid="home-pulse-badge"
            className={cn(
              "hidden @md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shrink-0",
              isUrgent
                ? "bg-alert/15 text-alert border-alert/30"
                : "bg-success/15 text-success border-success/30"
            )}
          >
            {isUrgent
              ? `${summary.urgentCount} due today · ${summary.completionVelocity} velocity`
              : `All caught up · ${summary.completionVelocity} completed`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          data-testid="home-new-task-button"
          onClick={onNewTask}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5" />
          New Task
          <span className="flex items-center justify-center size-4 rounded bg-primary-foreground/20 text-[10px] font-bold">
            C
          </span>
        </button>

        <button
          type="button"
          data-testid="home-search-button"
          onClick={onOpenSearch}
          className="h-8 px-2.5 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 text-xs font-medium text-muted-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-3.5" />
          <span>⌘K</span>
        </button>

        <button
          type="button"
          data-testid="home-refresh-button"
          onClick={onRefresh}
          aria-label="Refresh"
          className="flex items-center justify-center size-8 rounded-lg hover:bg-base-200 text-muted-foreground transition-colors cursor-pointer"
        >
          <HugeiconsIcon
            icon={RotateRight01Icon}
            strokeWidth={2}
            className={cn("size-3.5", isRefetching && "animate-spin")}
          />
        </button>

        <RSidebarToggle />
      </div>
    </div>
  );
}

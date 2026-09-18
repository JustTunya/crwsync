"use client";

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
  className,
}: HomeHeaderProps) {
  return (
    <div
      data-testid="home-header"
      className={cn(
        "flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200 shrink-0 bg-card/40 backdrop-blur-md @container",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <LSidebarToggle />

        <div className="flex flex-col min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-foreground">
            {summary?.greeting || "Home"}
          </h1>
          {summary?.todayFormatted && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-4 font-mono">
              {summary.todayFormatted}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <RSidebarToggle />
      </div>
    </div>
  );
}

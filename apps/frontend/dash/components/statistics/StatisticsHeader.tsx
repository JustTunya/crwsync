"use client";

import { useState } from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Activity01Icon,
  UserIcon,
  Folder01Icon,
  FilterIcon,
  Tick02Icon,
  Cancel01Icon,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import type {
  StatisticsInterval,
  StatisticsTab,
  ProjectStatBreakdown,
} from "@crwsync/types";
import { LSidebarToggle } from "@/components/l-sidebar";
import { RSidebarToggle } from "@/components/r-sidebar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface StatisticsHeaderProps {
  activeTab: StatisticsTab;
  onTabChange: (tab: StatisticsTab) => void;
  interval: StatisticsInterval;
  onIntervalChange: (interval: StatisticsInterval) => void;
  projectId?: string;
  onProjectChange?: (projectId?: string) => void;
  boardId?: string;
  onBoardChange?: (boardId?: string) => void;
  isFetching?: boolean;
  onRefresh?: () => void;
  projects?: ProjectStatBreakdown[];
  velocityCount?: number;
  className?: string;
}

const CONTROL =
  "flex items-center h-8 gap-1.5 px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer shrink-0";

const TABS: {
  value: StatisticsTab;
  label: string;
  icon: HugeiconsIconProps["icon"];
}[] = [
  { value: "overview", label: "Overview", icon: Activity01Icon },
  { value: "personal", label: "My Insights", icon: UserIcon },
  { value: "projects", label: "Projects & Boards", icon: Folder01Icon },
];

const INTERVALS: { value: StatisticsInterval; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export function StatisticsHeader({
  activeTab,
  onTabChange,
  interval,
  onIntervalChange,
  projectId,
  onProjectChange,
  boardId,
  onBoardChange,
  isFetching,
  onRefresh,
  projects = [],
  velocityCount,
  className,
}: StatisticsHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const selectedProject = projects.find((p) => p.projectId === projectId);
  const selectedBoard = selectedProject?.boards.find((b) => b.boardId === boardId);

  const filterLabel = selectedBoard
    ? `${selectedProject?.projectName} / ${selectedBoard.boardName}`
    : selectedProject
      ? selectedProject.projectName
      : "All Projects";

  const isFiltered = Boolean(projectId || boardId);

  return (
    <header
      data-testid="statistics-header"
      className={cn(
        "flex items-center justify-between gap-3 min-h-16 px-4 py-2.5 border-b border-base-200 shrink-0 flex-wrap lg:flex-nowrap bg-background/80 backdrop-blur-md sticky top-0 z-20",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <LSidebarToggle />
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">
              Statistics
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Workspace analytics & performance
            </p>
          </div>
          {typeof velocityCount === "number" && (
            <div
              data-testid="header-velocity-chip"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20"
            >
              <HugeiconsIcon
                icon={Activity01Icon}
                strokeWidth={2}
                className="size-3"
              />
              <span className="tabular-nums">{velocityCount} Velocity</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1 w-full sm:w-auto overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                data-testid={`tab-${tab.value}`}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={tab.icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="order-2 lg:order-3 flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {/* Interval pills */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {INTERVALS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`interval-${opt.value}`}
              onClick={() => onIntervalChange(opt.value)}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                interval === opt.value
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Project & Board Filter */}
        {projects.length > 0 && onProjectChange && (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-testid="project-filter"
                className={cn(
                  CONTROL,
                  isFiltered &&
                    "border-primary text-primary bg-primary/10 hover:bg-primary/15"
                )}
              >
                <HugeiconsIcon
                  icon={FilterIcon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                <span className="max-w-32 truncate">{filterLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onProjectChange(undefined);
                    onBoardChange?.(undefined);
                    setFilterOpen(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-base-200 cursor-pointer w-full text-left"
                >
                  <span>All Projects</span>
                  {!projectId && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2.5}
                      className="size-3.5 text-primary"
                    />
                  )}
                </button>

                <div className="h-px bg-border my-1" />

                {projects.map((proj) => {
                  const isProjActive = projectId === proj.projectId;
                  return (
                    <div key={proj.projectId} className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onProjectChange(proj.projectId);
                          onBoardChange?.(undefined);
                          setFilterOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-base-200 cursor-pointer w-full text-left",
                          isProjActive && !boardId && "bg-primary/10 text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                proj.color || "var(--color-primary)",
                            }}
                          />
                          <span className="truncate">{proj.projectName}</span>
                        </div>
                        {isProjActive && !boardId && (
                          <HugeiconsIcon
                            icon={Tick02Icon}
                            strokeWidth={2.5}
                            className="size-3.5 text-primary shrink-0"
                          />
                        )}
                      </button>

                      {isProjActive && proj.boards.length > 0 && onBoardChange && (
                        <div className="pl-4 flex flex-col gap-0.5 border-l border-border ml-2 my-0.5">
                          {proj.boards.map((board) => {
                            const isBoardActive = boardId === board.boardId;
                            return (
                              <button
                                key={board.boardId}
                                type="button"
                                onClick={() => {
                                  onBoardChange(board.boardId);
                                  setFilterOpen(false);
                                }}
                                className={cn(
                                  "flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-base-200 cursor-pointer w-full text-left",
                                  isBoardActive &&
                                    "bg-primary/15 text-primary font-medium"
                                )}
                              >
                                <span className="truncate">
                                  {board.boardName}
                                </span>
                                {isBoardActive && (
                                  <HugeiconsIcon
                                    icon={Tick02Icon}
                                    strokeWidth={2.5}
                                    className="size-3 text-primary shrink-0"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {isFiltered && onProjectChange && (
          <button
            type="button"
            onClick={() => {
              onProjectChange(undefined);
              onBoardChange?.(undefined);
            }}
            className={cn(CONTROL, "text-muted-foreground")}
            title="Clear project filter"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </button>
        )}

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            data-testid="refresh-button"
            onClick={onRefresh}
            aria-label="Refresh statistics"
            className={cn(CONTROL, "px-2")}
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              strokeWidth={2}
              className={cn("size-3.5", isFetching && "animate-spin")}
            />
          </button>
        )}

        <RSidebarToggle />
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Activity01Icon,
  UserIcon,
  Folder01Icon,
  Clock01Icon,
  Calendar04Icon,
  Tick02Icon,
  ReloadIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import type {
  StatisticsInterval,
  StatisticsTab,
  ProjectStatBreakdown,
} from "@crwsync/types";
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
  boardId?: string;
  onScopeChange?: (projectId?: string, boardId?: string) => void;
  isFetching?: boolean;
  onRefresh?: () => void;
  projects?: ProjectStatBreakdown[];
  velocityCount?: number;
  overdueCount?: number;
  throughputRatio?: number;
  className?: string;
}

const CONTROL =
  "flex items-center h-7 @md:h-8 gap-1.5 px-2.5 @md:px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-[11px] @md:text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer shrink-0";

const SEGMENT_CONTAINER =
  "inline-flex items-center gap-0.5 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 p-0.5 shrink-0";

const TABS: {
  value: StatisticsTab;
  label: string;
  shortLabel?: string;
  icon: HugeiconsIconProps["icon"];
}[] = [
  { value: "overview", label: "Overview", icon: Activity01Icon },
  { value: "personal", label: "My Insights", shortLabel: "Insights", icon: UserIcon },
  { value: "projects", label: "Projects & Boards", shortLabel: "Projects", icon: Folder01Icon },
];

const INTERVALS: {
  value: StatisticsInterval;
  label: string;
}[] = [
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
  boardId,
  onScopeChange,
  isFetching,
  onRefresh,
  projects = [],
  velocityCount,
  overdueCount = 0,
  className,
}: StatisticsHeaderProps) {
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);

  const selectedProject = projects.find((p) => p.projectId === projectId);
  const selectedBoard = selectedProject?.boards.find((b) => b.boardId === boardId);

  const filterLabel = selectedBoard
    ? `${selectedProject?.projectName} / ${selectedBoard.boardName}`
    : selectedProject
      ? selectedProject.projectName
      : "All Projects";

  const isFiltered = Boolean(projectId || boardId);
  const activeIntervalLabel =
    INTERVALS.find((i) => i.value === interval)?.label ?? interval;

  return (
    <div
      data-testid="statistics-header"
      className={cn(
        "@container flex items-center justify-between gap-2 @sm:gap-3 px-3 @md:px-4 @xl:px-6 py-2 @md:py-2.5 border-b border-base-200 shrink-0 min-w-0 w-full overflow-hidden",
        className
      )}
    >
      {/* Left Section: View Tabs + Scope Filter */}
      <div className="flex items-center gap-1.5 @sm:gap-2 @md:gap-2.5 min-w-0 shrink-0">
        {/* Segmented View Switcher */}
        <div className={SEGMENT_CONTAINER}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                data-testid={`tab-${tab.value}`}
                onClick={() => onTabChange(tab.value)}
                title={tab.label}
                aria-label={tab.label}
                className={cn(
                  "inline-flex items-center justify-center gap-1 @sm:gap-1.5 h-6 @md:h-7 px-2 @md:px-3 rounded-md text-[11px] @md:text-xs font-semibold transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <HugeiconsIcon
                  icon={tab.icon}
                  strokeWidth={2.25}
                  className={cn(
                    "size-3 @md:size-3.5 shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
                <span className="hidden @md:inline @xl:hidden">{tab.shortLabel ?? tab.label}</span>
                <span className="hidden @xl:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-border/80 hidden @sm:block shrink-0" />

        {/* Project & Board Filter */}
        {projects.length > 0 && onScopeChange && (
          <FilterPopover
            label={filterLabel}
            icon={Folder01Icon}
            active={isFiltered}
            testId="project-filter"
            open={projectFilterOpen}
            onOpenChange={setProjectFilterOpen}
          >
            <SelectRow
              checked={!projectId}
              onClick={() => {
                onScopeChange(undefined, undefined);
                setProjectFilterOpen(false);
              }}
            >
              <span className="truncate">All Projects</span>
            </SelectRow>

            {projects.map((proj) => {
              const isProjActive = projectId === proj.projectId;
              return (
                <div key={proj.projectId} className="flex flex-col gap-0.5">
                  <SelectRow
                    checked={isProjActive && !boardId}
                    onClick={() => {
                      onScopeChange(proj.projectId, undefined);
                      setProjectFilterOpen(false);
                    }}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: proj.color || "var(--color-primary)",
                      }}
                    />
                    <span className="truncate">{proj.projectName}</span>
                  </SelectRow>

                  {isProjActive && proj.boards.length > 0 && (
                    <div className="pl-4 flex flex-col gap-0.5 border-l border-border ml-2 my-0.5">
                      {proj.boards.map((board) => {
                        const isBoardActive = boardId === board.boardId;
                        return (
                          <button
                            key={board.boardId}
                            type="button"
                            onClick={() => {
                              onScopeChange(proj.projectId, board.boardId);
                              setProjectFilterOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-base-200 cursor-pointer w-full text-left",
                              isBoardActive &&
                                "bg-primary/15 text-primary font-medium"
                            )}
                          >
                            <span className="truncate">{board.boardName}</span>
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
          </FilterPopover>
        )}
      </div>

      {/* Right Section: Interval Selector + Refresh + Metric Chips */}
      <div className="flex items-center gap-1.5 @sm:gap-2 @md:gap-2.5 shrink-0">
        {/* Desktop Interval Selector - only shown when container is wide (>=1152px / @6xl) */}
        <div className={cn(SEGMENT_CONTAINER, "hidden @6xl:inline-flex")}>
          {INTERVALS.map((opt) => {
            const isSelected = interval === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                data-testid={`interval-${opt.value}`}
                onClick={() => onIntervalChange(opt.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Mobile/Tablet/Compact Interval Dropdown */}
        <div className="inline-flex @6xl:hidden">
          <Popover open={intervalDropdownOpen} onOpenChange={setIntervalDropdownOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-testid="interval-dropdown"
                className={CONTROL}
                title="Select time interval"
              >
                <HugeiconsIcon
                  icon={Calendar04Icon}
                  strokeWidth={2}
                  className="size-3 @md:size-3.5 shrink-0 text-muted-foreground"
                />
                <span>{activeIntervalLabel}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="size-2.5 @md:size-3 shrink-0 text-muted-foreground"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5" align="end">
              <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                {INTERVALS.map((opt) => {
                  const isSelected = interval === opt.value;
                  return (
                    <SelectRow
                      key={opt.value}
                      testId={`interval-option-${opt.value}`}
                      checked={isSelected}
                      onClick={() => {
                        onIntervalChange(opt.value);
                        setIntervalDropdownOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                    </SelectRow>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            data-testid="refresh-button"
            onClick={onRefresh}
            aria-label="Refresh statistics"
            className={cn(CONTROL, "px-2 @md:px-2.5")}
            title="Refresh statistics"
          >
            <HugeiconsIcon
              icon={ReloadIcon}
              strokeWidth={2}
              className={cn("size-3 @md:size-3.5 shrink-0", isFetching && "animate-spin")}
            />
          </button>
        )}

        {/* Metric Summary Chips - only shown when container is ultra-wide (>=1152px / @6xl) */}
        {(typeof overdueCount === "number" || typeof velocityCount === "number") && (
          <div className="h-4 w-px bg-border/80 hidden @6xl:block shrink-0" />
        )}

        {typeof overdueCount === "number" && (
          <div
            data-testid="metric-overdue"
            className={cn(
              "hidden @6xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors shrink-0",
              overdueCount > 0
                ? "bg-error/10 text-error border-error/20"
                : "bg-base-200/50 text-muted-foreground border-base-300/60"
            )}
            title={`${overdueCount} Overdue tasks`}
          >
            <HugeiconsIcon
              icon={Clock01Icon}
              strokeWidth={2}
              className="size-3.5 shrink-0"
            />
            <span>{overdueCount} Overdue</span>
          </div>
        )}

        {typeof velocityCount === "number" && (
          <div
            data-testid="metric-velocity"
            className={cn(
              "hidden @6xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors shrink-0",
              velocityCount > 0
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-base-200/50 text-muted-foreground border-base-300/60"
            )}
            title={`${velocityCount} Completed tasks`}
          >
            <HugeiconsIcon
              icon={Activity01Icon}
              strokeWidth={2}
              className="size-3.5 text-primary shrink-0"
            />
            <span>{velocityCount} Completed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPopover({
  label,
  icon,
  active,
  testId,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  icon: HugeiconsIconProps["icon"];
  active?: boolean;
  testId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          title={label}
          className={cn(
            CONTROL,
            active &&
              "border-primary text-primary bg-primary/10 hover:bg-primary/15"
          )}
        >
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3 @md:size-3.5 shrink-0" />
          <span className="truncate max-w-20 @xs:max-w-28 @sm:max-w-36 @md:max-w-44 @xl:max-w-56">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" align="start">
        <div className="flex flex-col max-h-64 overflow-y-auto">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function SelectRow({
  checked,
  onClick,
  testId,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium hover:bg-base-200 cursor-pointer w-full text-left"
    >
      <span
        className={cn(
          "flex items-center justify-center size-4 rounded-full border-[1.5px] shrink-0 transition-colors",
          checked ? "border-primary bg-primary" : "border-base-300"
        )}
      >
        {checked && (
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={3}
            className="size-2.5 text-primary-foreground"
          />
        )}
      </span>
      <div className="flex items-center gap-2 min-w-0 truncate">{children}</div>
    </button>
  );
}

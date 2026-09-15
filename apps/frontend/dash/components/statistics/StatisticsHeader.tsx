"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Activity01Icon,
  UserIcon,
  Folder01Icon,
  Calendar04Icon,
  Clock01Icon,
  Tag01Icon,
  Tick02Icon,
  Cancel01Icon,
  ArrowReloadHorizontalIcon,
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
  onProjectChange?: (projectId?: string) => void;
  boardId?: string;
  onBoardChange?: (boardId?: string) => void;
  isFetching?: boolean;
  onRefresh?: () => void;
  projects?: ProjectStatBreakdown[];
  velocityCount?: number;
  overdueCount?: number;
  throughputRatio?: number;
  className?: string;
}

const CONTROL =
  "flex items-center h-8 gap-1.5 px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer";

const TABS: {
  value: StatisticsTab;
  label: string;
  icon: HugeiconsIconProps["icon"];
}[] = [
  { value: "overview", label: "Overview", icon: Activity01Icon },
  { value: "personal", label: "My Insights", icon: UserIcon },
  { value: "projects", label: "Projects & Boards", icon: Folder01Icon },
];

const INTERVALS: {
  value: StatisticsInterval;
  label: string;
  fullLabel: string;
}[] = [
  { value: "7d", label: "7 Days", fullLabel: "Last 7 days" },
  { value: "14d", label: "14 Days", fullLabel: "Last 14 days" },
  { value: "30d", label: "30 Days", fullLabel: "Last 30 days" },
  { value: "90d", label: "90 Days", fullLabel: "Last 90 days" },
  { value: "6m", label: "6 Months", fullLabel: "Last 6 months" },
  { value: "1y", label: "1 Year", fullLabel: "Last 1 year" },
  { value: "all", label: "All Time", fullLabel: "All time" },
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
  overdueCount = 0,
  throughputRatio,
  className,
}: StatisticsHeaderProps) {
  const selectedProject = projects.find((p) => p.projectId === projectId);
  const selectedBoard = selectedProject?.boards.find((b) => b.boardId === boardId);

  const filterLabel = selectedBoard
    ? `${selectedProject?.projectName} / ${selectedBoard.boardName}`
    : selectedProject
      ? selectedProject.projectName
      : "All Projects";

  const isFiltered = Boolean(projectId || boardId);
  const tabLabel = TABS.find((t) => t.value === activeTab)?.label ?? "Overview";
  const TabIcon = TABS.find((t) => t.value === activeTab)?.icon ?? Activity01Icon;
  const intervalLabel =
    INTERVALS.find((i) => i.value === interval)?.label ?? "30 Days";

  return (
    <div
      data-testid="statistics-header"
      className={cn(
        "flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-base-200 shrink-0 flex-wrap",
        className
      )}
    >
      {/* Left side: Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tab / Perspective Filter */}
        <FilterPopover
          label={tabLabel}
          icon={TabIcon}
          active={activeTab !== "overview"}
          testId="tab-filter"
        >
          {TABS.map((t) => (
            <SelectRow
              key={t.value}
              testId={`tab-${t.value}`}
              checked={activeTab === t.value}
              onClick={() => onTabChange(t.value)}
            >
              <HugeiconsIcon icon={t.icon} strokeWidth={2} className="size-3.5" />
              <span className="truncate">{t.label}</span>
            </SelectRow>
          ))}
        </FilterPopover>

        {/* Time Range Filter */}
        <FilterPopover
          label={intervalLabel}
          icon={Calendar04Icon}
          active={interval !== "30d"}
          testId="interval-filter"
        >
          {INTERVALS.map((opt) => (
            <SelectRow
              key={opt.value}
              testId={`interval-${opt.value}`}
              checked={interval === opt.value}
              onClick={() => onIntervalChange(opt.value)}
            >
              <span className="truncate">{opt.fullLabel}</span>
            </SelectRow>
          ))}
        </FilterPopover>

        {/* Project & Board Filter */}
        {projects.length > 0 && onProjectChange && (
          <FilterPopover
            label={filterLabel}
            icon={Folder01Icon}
            active={isFiltered}
            testId="project-filter"
          >
            <SelectRow
              checked={!projectId}
              onClick={() => {
                onProjectChange(undefined);
                onBoardChange?.(undefined);
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
                      onProjectChange(proj.projectId);
                      onBoardChange?.(undefined);
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

                  {isProjActive && proj.boards.length > 0 && onBoardChange && (
                    <div className="pl-4 flex flex-col gap-0.5 border-l border-border ml-2 my-0.5">
                      {proj.boards.map((board) => {
                        const isBoardActive = boardId === board.boardId;
                        return (
                          <button
                            key={board.boardId}
                            type="button"
                            onClick={() => onBoardChange(board.boardId)}
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

        {/* Clear Filters button */}
        {(isFiltered || interval !== "30d" || activeTab !== "overview") && (
          <button
            type="button"
            onClick={() => {
              onTabChange("overview");
              onIntervalChange("30d");
              onProjectChange?.(undefined);
              onBoardChange?.(undefined);
            }}
            className={cn(CONTROL, "text-muted-foreground")}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            <span>Clear filters</span>
          </button>
        )}

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            data-testid="refresh-button"
            onClick={onRefresh}
            aria-label="Refresh statistics"
            className={CONTROL}
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              strokeWidth={2}
              className={cn("size-3.5", isFetching && "animate-spin")}
            />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Right side: Metric summary chips */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {typeof overdueCount === "number" && (
          <div
            data-testid="metric-overdue"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              overdueCount > 0
                ? "bg-error/10 text-error border-error/20"
                : "bg-base-200/50 text-muted-foreground border-base-300/60"
            )}
          >
            <HugeiconsIcon
              icon={Clock01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            <span>{overdueCount} Overdue</span>
          </div>
        )}

        {typeof velocityCount === "number" && (
          <div
            data-testid="metric-velocity"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              velocityCount > 0
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-base-200/50 text-muted-foreground border-base-300/60"
            )}
          >
            <HugeiconsIcon
              icon={Activity01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            <span>{velocityCount} Completed</span>
          </div>
        )}

        {typeof throughputRatio === "number" && (
          <div
            data-testid="metric-throughput"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-base-200/50 text-foreground border-base-300/60 transition-colors"
          >
            <HugeiconsIcon
              icon={Tag01Icon}
              strokeWidth={2}
              className="size-3.5 text-info"
            />
            <span>{throughputRatio}x Throughput</span>
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
  children,
}: {
  label: string;
  icon: HugeiconsIconProps["icon"];
  active?: boolean;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          className={cn(
            CONTROL,
            active &&
              "border-primary text-primary bg-primary/10 hover:bg-primary/15"
          )}
        >
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
          <span>{label}</span>
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

"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Calendar04Icon,
  Clock01Icon,
  Flag02Icon,
} from "@hugeicons/core-free-icons";
import {
  TaskPriorityEnum,
  type ScheduleScope,
  type ScheduleCounts,
} from "@crwsync/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SchedulesHeaderProps {
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  priority?: TaskPriorityEnum;
  onPriorityChange?: (priority: TaskPriorityEnum | undefined) => void;
  counts?: ScheduleCounts;
  className?: string;
}

const SCOPES: { value: ScheduleScope; label: string; testId: string }[] = [
  {
    value: "assigned_to_me",
    label: "Assigned to Me",
    testId: "scope-assigned-to-me",
  },
  {
    value: "created_by_me",
    label: "Created by Me",
    testId: "scope-created-by-me",
  },
  {
    value: "all",
    label: "All Tasks",
    testId: "scope-all",
  },
];

export function SchedulesHeader({
  scope,
  onScopeChange,
  priority,
  onPriorityChange,
  counts,
  className,
}: SchedulesHeaderProps) {
  const overdueCount = counts?.overdue ?? 0;
  const todayCount = counts?.today ?? 0;
  const thisWeekCount = counts?.thisWeek ?? 0;

  return (
    <div
      data-testid="schedules-header"
      className={cn("flex flex-col gap-4 pb-4 border-b border-base-200", className)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            <HugeiconsIcon
              icon={Calendar03Icon}
              strokeWidth={2}
              className="size-5"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Schedules
            </h1>
            <p className="text-xs text-muted-foreground">
              Track deadlines, scheduled deliveries, and cadence across all boards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div
            role="tablist"
            aria-label="Task scope"
            className="flex items-center p-1 rounded-lg bg-base-200/80 border border-base-300/60"
          >
            {SCOPES.map((s) => {
              const active = scope === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={s.testId}
                  onClick={() => onScopeChange(s.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer select-none",
                    active
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-base-200"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="w-[140px] shrink-0">
            <Select
              value={priority ?? "ALL"}
              onValueChange={(val) =>
                onPriorityChange?.(
                  val === "ALL" ? undefined : (val as TaskPriorityEnum)
                )
              }
            >
              <SelectTrigger
                className="h-8 text-xs cursor-pointer"
                data-testid="priority-filter"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <HugeiconsIcon
                    icon={Flag02Icon}
                    strokeWidth={2}
                    className="size-3 text-muted-foreground shrink-0"
                  />
                  <SelectValue placeholder="Priority" />
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value={TaskPriorityEnum.URGENT}>Urgent</SelectItem>
                <SelectItem value={TaskPriorityEnum.HIGH}>High</SelectItem>
                <SelectItem value={TaskPriorityEnum.MEDIUM}>Medium</SelectItem>
                <SelectItem value={TaskPriorityEnum.LOW}>Low</SelectItem>
                <SelectItem value={TaskPriorityEnum.NONE}>None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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

        <div
          data-testid="metric-today"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
            todayCount > 0
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-base-200/50 text-muted-foreground border-base-300/60"
          )}
        >
          <HugeiconsIcon
            icon={Calendar04Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          <span>{todayCount} Due Today</span>
        </div>

        <div
          data-testid="metric-this-week"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
            thisWeekCount > 0
              ? "bg-info/10 text-info border-info/20"
              : "bg-base-200/50 text-muted-foreground border-base-300/60"
          )}
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          <span>{thisWeekCount} This Week</span>
        </div>
      </div>
    </div>
  );
}

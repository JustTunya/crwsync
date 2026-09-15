"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Calendar04Icon,
  Clock01Icon,
  Flag02Icon,
  UserIcon,
  Tick02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import {
  TaskPriorityEnum,
  type ScheduleScope,
  type ScheduleCounts,
} from "@crwsync/types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SchedulesHeaderProps {
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  priority?: TaskPriorityEnum;
  onPriorityChange?: (priority: TaskPriorityEnum | undefined) => void;
  counts?: ScheduleCounts;
  className?: string;
}

const CONTROL =
  "flex items-center h-8 gap-1.5 px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer";

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

const PRIORITY_LABELS: Record<TaskPriorityEnum, string> = {
  [TaskPriorityEnum.URGENT]: "Urgent",
  [TaskPriorityEnum.HIGH]: "High",
  [TaskPriorityEnum.MEDIUM]: "Medium",
  [TaskPriorityEnum.LOW]: "Low",
  [TaskPriorityEnum.NONE]: "None",
};

const PRIORITY_DOT: Record<TaskPriorityEnum, string> = {
  [TaskPriorityEnum.NONE]: "bg-muted-foreground",
  [TaskPriorityEnum.LOW]: "bg-info",
  [TaskPriorityEnum.MEDIUM]: "bg-warning",
  [TaskPriorityEnum.HIGH]: "bg-alert",
  [TaskPriorityEnum.URGENT]: "bg-error",
};

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

  const scopeLabel =
    SCOPES.find((s) => s.value === scope)?.label ?? "Scope";
  const priorityLabel = priority
    ? PRIORITY_LABELS[priority]
    : "Priority";

  return (
    <div
      data-testid="schedules-header"
      className={cn(
        "flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-base-200 shrink-0 flex-wrap",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <FilterPopover
          label={scopeLabel}
          icon={UserIcon}
          active={scope !== "assigned_to_me"}
        >
          {SCOPES.map((s) => (
            <SelectRow
              key={s.value}
              testId={s.testId}
              checked={scope === s.value}
              onClick={() => onScopeChange(s.value)}
            >
              <span className="truncate">{s.label}</span>
            </SelectRow>
          ))}
        </FilterPopover>

        <FilterPopover
          label={priorityLabel}
          icon={Flag02Icon}
          active={!!priority}
          testId="priority-filter"
        >
          <SelectRow
            checked={!priority}
            onClick={() => onPriorityChange?.(undefined)}
          >
            <span className="truncate">All Priorities</span>
          </SelectRow>
          {Object.values(TaskPriorityEnum).map((p) => (
            <SelectRow
              key={p}
              checked={priority === p}
              onClick={() => onPriorityChange?.(priority === p ? undefined : p)}
            >
              <span
                className={cn("size-2.5 rounded-full shrink-0", PRIORITY_DOT[p])}
              />
              <span className="truncate">{PRIORITY_LABELS[p]}</span>
            </SelectRow>
          ))}
        </FilterPopover>

        {(!!priority || scope !== "assigned_to_me") && (
          <button
            type="button"
            onClick={() => {
              onScopeChange("assigned_to_me");
              onPriorityChange?.(undefined);
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
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
            icon={Calendar04Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          <span>{thisWeekCount} This Week</span>
        </div>
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
      <PopoverContent className="w-48 p-1.5" align="start">
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

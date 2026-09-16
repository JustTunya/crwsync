"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Calendar04Icon,
  Clock01Icon,
  Flag02Icon,
  UserIcon,
  Tick02Icon,
  Cancel01Icon,
  FilterIcon,
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
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  "flex items-center h-7 @md:h-8 gap-1.5 px-2.5 @md:px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-[11px] @md:text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer shrink-0";

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

  const activeFilterCount =
    (priority ? 1 : 0) + (scope !== "assigned_to_me" ? 1 : 0);

  const clearFilters = () => {
    onScopeChange("assigned_to_me");
    onPriorityChange?.(undefined);
  };

  const scopeRows = SCOPES.map((s) => (
    <SelectRow
      key={s.value}
      testId={s.testId}
      checked={scope === s.value}
      onClick={() => onScopeChange(s.value)}
    >
      <span className="truncate">{s.label}</span>
    </SelectRow>
  ));

  const priorityRows = [
    <SelectRow
      key="none"
      checked={!priority}
      onClick={() => onPriorityChange?.(undefined)}
    >
      <span className="truncate">All Priorities</span>
    </SelectRow>,
    ...Object.values(TaskPriorityEnum).map((p) => (
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
    )),
  ];

  return (
    <div
      data-testid="schedules-header"
      className={cn(
        "@container flex items-center justify-between gap-2 px-3 @md:px-4 @xl:px-6 py-2 @md:py-2.5 border-b border-base-200 shrink-0 min-w-0 w-full overflow-hidden",
        className
      )}
    >
      <div className="hidden @lg:flex items-center gap-2 min-w-0">
        <FilterPopover
          label={scopeLabel}
          icon={UserIcon}
          active={scope !== "assigned_to_me"}
        >
          {scopeRows}
        </FilterPopover>

        <FilterPopover
          label={priorityLabel}
          icon={Flag02Icon}
          active={!!priority}
          testId="priority-filter"
        >
          {priorityRows}
        </FilterPopover>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
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

      <div className="flex @lg:hidden items-center gap-2 min-w-0">
        <MobileFilterSheet
          count={activeFilterCount}
          onClearFilters={clearFilters}
          sections={[
            { label: "Scope", rows: scopeRows },
            { label: "Priority", rows: priorityRows },
          ]}
        />
      </div>

      <div className="flex items-center gap-1.5 @md:gap-2 shrink-0 min-w-0">
        <MetricChip
          testId="metric-overdue"
          count={overdueCount}
          label="Overdue"
          icon={Clock01Icon}
          activeClass="bg-error/10 text-error border-error/20"
          className="hidden @sm:inline-flex"
        />

        <MetricChip
          testId="metric-today"
          count={todayCount}
          label="Due Today"
          icon={Calendar04Icon}
          activeClass="bg-primary/10 text-primary border-primary/20"
          className="hidden @md:inline-flex"
        />

        <MetricChip
          testId="metric-this-week"
          count={thisWeekCount}
          label="This Week"
          icon={Calendar04Icon}
          activeClass="bg-info/10 text-info border-info/20"
          className="hidden @xl:inline-flex"
        />
      </div>
    </div>
  );
}

function MetricChip({
  testId,
  count,
  label,
  icon,
  activeClass,
  className,
}: {
  testId: string;
  count: number;
  label: string;
  icon: HugeiconsIconProps["icon"];
  activeClass: string;
  className?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0",
        count > 0
          ? activeClass
          : "bg-base-200/50 text-muted-foreground border-base-300/60",
        className
      )}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
      <span>
        {count} {label}
      </span>
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

interface MobileFilterSection {
  label: string;
  rows: React.ReactNode[];
}

function MobileFilterSheet({
  count,
  sections,
  onClearFilters,
}: {
  count: number;
  sections: MobileFilterSection[];
  onClearFilters: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid="schedules-mobile-filters-trigger"
          className={cn(
            CONTROL,
            count > 0 &&
              "border-primary text-primary bg-primary/10 hover:bg-primary/15"
          )}
        >
          <HugeiconsIcon icon={FilterIcon} strokeWidth={2} className="size-3.5" />
          Filters
          {count > 0 && (
            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {count}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 max-w-full w-full rounded-b-none rounded-t-2xl border-b-0 p-0 gap-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:max-w-full"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-base-300 shrink-0" />
        <DialogTitle className="px-4 pt-3 pb-1 text-base font-semibold">Filters</DialogTitle>

        <div className="flex flex-col gap-1 px-2 pb-3 max-h-[60vh] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <p className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                {section.label}
              </p>
              {section.rows}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200">
          {count > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className={cn(CONTROL, "text-muted-foreground flex-1 justify-center")}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
              Clear filters
            </button>
          )}
          <DialogClose asChild>
            <button
              type="button"
              className={cn(
                CONTROL,
                "flex-1 justify-center bg-primary border-primary text-primary-foreground hover:bg-primary"
              )}
            >
              Done
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

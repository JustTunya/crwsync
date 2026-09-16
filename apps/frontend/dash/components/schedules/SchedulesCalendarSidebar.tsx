"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar04Icon,
  Clock01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import type { ScheduleCounts, ScheduleTask } from "@crwsync/types";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface SchedulesCalendarSidebarProps {
  tasks?: ScheduleTask[];
  selectedDate?: Date;
  onSelectDate?: (date: Date | undefined) => void;
  counts?: ScheduleCounts;
  onRescheduleOverdue?: () => void;
  isReschedulingOverdue?: boolean;
  showCompleted?: boolean;
  onToggleShowCompleted?: (show: boolean) => void;
  className?: string;
}

export function SchedulesCalendarSidebar({
  tasks,
  selectedDate,
  onSelectDate,
  counts,
  onRescheduleOverdue,
  isReschedulingOverdue = false,
  showCompleted = false,
  onToggleShowCompleted,
  className,
}: SchedulesCalendarSidebarProps) {
  const deadlineDates = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks
      .filter((task) => !!task.due_date)
      .map((task) => new Date(task.due_date!));
  }, [tasks]);

  return (
    <aside
      data-testid="schedules-calendar-sidebar"
      className={cn("flex flex-col gap-4 w-full @4xl:w-72 shrink-0", className)}
    >
      <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-border bg-card shadow-sm">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          modifiers={{
            hasDeadline: deadlineDates,
          }}
          modifiersClassNames={{
            hasDeadline:
              "font-bold underline decoration-primary decoration-2 underline-offset-4",
          }}
          className="p-0 w-full flex justify-center bg-transparent"
        />

        <div className="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shrink-0" />
          <span>Dates with deadlines</span>
        </div>

        {selectedDate && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <HugeiconsIcon
                icon={Calendar04Icon}
                strokeWidth={2}
                className="size-3.5 text-primary shrink-0"
              />
              <span className="font-medium text-primary truncate">
                {format(selectedDate, "MMM d, yyyy")}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectDate?.(undefined)}
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/20 shrink-0 gap-1 cursor-pointer"
              data-testid="clear-date-filter"
              aria-label="Clear date filter"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-3"
              />
              <span>Clear</span>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border bg-card shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Clock01Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span>Quick Triage</span>
        </div>

        {counts && counts.overdue > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRescheduleOverdue}
            disabled={isReschedulingOverdue}
            data-testid="reschedule-overdue-button"
            className="w-full justify-start text-xs border-error/30 hover:border-error/50 hover:bg-error/10 text-error gap-2 h-auto py-2 whitespace-normal text-left"
          >
            <HugeiconsIcon
              icon={Clock01Icon}
              strokeWidth={2}
              className="size-3.5 text-error shrink-0"
            />
            <span className="truncate">
              Reschedule {counts.overdue} overdue to Today
            </span>
          </Button>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          <label
            htmlFor="toggle-completed-tasks"
            className="text-xs font-medium text-foreground/80 cursor-pointer select-none"
          >
            {showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
          </label>
          <Checkbox
            id="toggle-completed-tasks"
            checked={showCompleted}
            onCheckedChange={(checked) => onToggleShowCompleted?.(!!checked)}
            data-testid="toggle-completed-tasks"
            aria-label="Toggle completed tasks"
          />
        </div>
      </div>
    </aside>
  );
}

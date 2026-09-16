"use client";

import { useState, useMemo } from "react";
import {
  format,
  isSameDay,
  startOfToday,
  addDays,
  endOfWeek,
  startOfDay,
} from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar04Icon,
  Clock01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { ScheduleTask } from "@crwsync/types";
import { ScheduleTaskRow } from "@/components/schedules/ScheduleTaskRow";
import { cn } from "@/lib/utils";

export interface SchedulesAgendaProps {
  tasks?: ScheduleTask[];
  selectedDate?: Date;
  onTaskClick?: (task: ScheduleTask) => void;
  onToggleComplete?: (task: ScheduleTask, completed: boolean) => void;
  onReschedule?: (task: ScheduleTask, newDueDate: string | null) => void;
  className?: string;
}

export function SchedulesAgenda({
  tasks,
  selectedDate,
  onTaskClick,
  onToggleComplete,
  onReschedule,
  className,
}: SchedulesAgendaProps) {
  const [noDueDateOpen, setNoDueDateOpen] = useState(false);

  const { overdue, dueToday, dueTomorrow, thisWeek, later, noDueDate } =
    useMemo(() => {
      const overdue: ScheduleTask[] = [];
      const dueToday: ScheduleTask[] = [];
      const dueTomorrow: ScheduleTask[] = [];
      const thisWeek: ScheduleTask[] = [];
      const later: ScheduleTask[] = [];
      const noDueDate: ScheduleTask[] = [];

      if (!tasks) {
        return { overdue, dueToday, dueTomorrow, thisWeek, later, noDueDate };
      }

      const today = startOfToday();
      const tomorrow = addDays(today, 1);
      const endThisWeek = endOfWeek(today, { weekStartsOn: 1 });

      for (const task of tasks) {
        if (!task.due_date) {
          noDueDate.push(task);
          continue;
        }

        const taskDate = new Date(task.due_date);
        const taskStartDay = startOfDay(taskDate);
        const isCompleted =
          task.column?.type === "COMPLETE" || !!task.completed_at;

        if (taskStartDay < today) {
          if (!isCompleted) {
            overdue.push(task);
          } else {
            later.push(task);
          }
        } else if (isSameDay(taskDate, today)) {
          dueToday.push(task);
        } else if (isSameDay(taskDate, tomorrow)) {
          dueTomorrow.push(task);
        } else if (taskStartDay > tomorrow && taskStartDay <= endThisWeek) {
          thisWeek.push(task);
        } else {
          later.push(task);
        }
      }

      const sortByDate = (a: ScheduleTask, b: ScheduleTask) => {
        const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return timeA - timeB;
      };

      overdue.sort(sortByDate);
      dueToday.sort(sortByDate);
      dueTomorrow.sort(sortByDate);
      thisWeek.sort(sortByDate);
      later.sort(sortByDate);

      return { overdue, dueToday, dueTomorrow, thisWeek, later, noDueDate };
    }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate || !tasks) return [];
    return tasks
      .filter(
        (task) =>
          !!task.due_date && isSameDay(new Date(task.due_date), selectedDate)
      )
      .sort((a, b) => {
        const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return timeA - timeB;
      });
  }, [selectedDate, tasks]);

  if (selectedDate) {
    return (
      <div
        data-testid="schedules-agenda"
        className={cn("flex flex-col gap-6", className)}
      >
        <div
          data-testid="agenda-section-selected-date"
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Calendar04Icon}
                strokeWidth={2}
                className="size-4 text-primary"
              />
              <span className="font-semibold text-sm text-foreground">
                Tasks due on {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {selectedDateTasks.length}
              </span>
            </div>
          </div>

          {selectedDateTasks.length === 0 ? (
            <div
              data-testid="agenda-empty-state"
              className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center"
            >
              <HugeiconsIcon
                icon={Calendar04Icon}
                strokeWidth={1.5}
                className="size-8 text-muted-foreground/60 mb-2"
              />
              <p className="text-sm font-medium text-foreground/80">
                No tasks due on this date
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Select another date or clear the filter to view all scheduled tasks.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDateTasks.map((task) => (
                <ScheduleTaskRow
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onToggleComplete={onToggleComplete}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasAnyTasks =
    overdue.length > 0 ||
    dueToday.length > 0 ||
    dueTomorrow.length > 0 ||
    thisWeek.length > 0 ||
    later.length > 0 ||
    noDueDate.length > 0;

  if (!hasAnyTasks) {
    return (
      <div
        data-testid="schedules-agenda"
        className={cn("flex flex-col gap-6", className)}
      >
        <div
          data-testid="agenda-empty-state"
          className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-muted/20 text-center"
        >
          <div className="size-12 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center mb-3">
            <HugeiconsIcon
              icon={Calendar04Icon}
              strokeWidth={1.5}
              className="size-6 text-muted-foreground"
            />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No scheduled tasks
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            There are no tasks matching the selected filters. Change scope or priority to see more tasks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="schedules-agenda"
      className={cn("flex flex-col gap-6", className)}
    >
      {overdue.length > 0 && (
        <section
          data-testid="agenda-section-overdue"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider text-error">
            <HugeiconsIcon
              icon={Clock01Icon}
              strokeWidth={2}
              className="size-3.5 text-error"
            />
            <span>Overdue</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full border bg-error/10 text-error border-error/20">
              {overdue.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {overdue.map((task) => (
              <ScheduleTaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                onReschedule={onReschedule}
              />
            ))}
          </div>
        </section>
      )}

      {dueToday.length > 0 && (
        <section
          data-testid="agenda-section-today"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <HugeiconsIcon
              icon={Calendar04Icon}
              strokeWidth={2}
              className="size-3.5 text-primary"
            />
            <span>Due Today</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full border bg-primary/10 text-primary border-primary/20">
              {dueToday.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {dueToday.map((task) => (
              <ScheduleTaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                onReschedule={onReschedule}
              />
            ))}
          </div>
        </section>
      )}

      {dueTomorrow.length > 0 && (
        <section
          data-testid="agenda-section-tomorrow"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/80">
            <HugeiconsIcon
              icon={Calendar04Icon}
              strokeWidth={2}
              className="size-3.5 text-muted-foreground"
            />
            <span>Tomorrow</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full border bg-muted/40 text-muted-foreground border-border">
              {dueTomorrow.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {dueTomorrow.map((task) => (
              <ScheduleTaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                onReschedule={onReschedule}
              />
            ))}
          </div>
        </section>
      )}

      {thisWeek.length > 0 && (
        <section
          data-testid="agenda-section-this-week"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/80">
            <HugeiconsIcon
              icon={Calendar04Icon}
              strokeWidth={2}
              className="size-3.5 text-muted-foreground"
            />
            <span>This Week</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full border bg-muted/40 text-muted-foreground border-border">
              {thisWeek.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {thisWeek.map((task) => (
              <ScheduleTaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                onReschedule={onReschedule}
              />
            ))}
          </div>
        </section>
      )}

      {later.length > 0 && (
        <section
          data-testid="agenda-section-later"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <HugeiconsIcon
              icon={Calendar04Icon}
              strokeWidth={2}
              className="size-3.5 text-muted-foreground"
            />
            <span>Later</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full border bg-muted/40 text-muted-foreground border-border">
              {later.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {later.map((task) => (
              <ScheduleTaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                onReschedule={onReschedule}
              />
            ))}
          </div>
        </section>
      )}

      {noDueDate.length > 0 && (
        <section
          data-testid="agenda-section-no-due-date"
          className="flex flex-col gap-2.5 pt-2 border-t border-border/60"
        >
          <button
            type="button"
            onClick={() => setNoDueDateOpen((prev) => !prev)}
            data-testid="toggle-no-due-date"
            aria-expanded={noDueDateOpen}
            className="flex items-center justify-between w-full py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={noDueDateOpen ? ArrowDown01Icon : ArrowRight01Icon}
                strokeWidth={2}
                className="size-3.5 text-muted-foreground group-hover:text-foreground transition-transform"
              />
              <span>No Due Date</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full border bg-muted/40 text-muted-foreground border-border">
                {noDueDate.length}
              </span>
            </div>
          </button>
          {noDueDateOpen && (
            <div className="flex flex-col gap-2">
              {noDueDate.map((task) => (
                <ScheduleTaskRow
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onToggleComplete={onToggleComplete}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

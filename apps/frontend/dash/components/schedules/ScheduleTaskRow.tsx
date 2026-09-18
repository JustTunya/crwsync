"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Flag02Icon } from "@hugeicons/core-free-icons";
import type { ScheduleTask, HomeTaskItem } from "@crwsync/types";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
import { QuickRescheduleMenu } from "@/components/schedules/QuickRescheduleMenu";
import { cn } from "@/lib/utils";

export interface ScheduleTaskRowProps<T extends ScheduleTask | HomeTaskItem = ScheduleTask> {
  task: T;
  onTaskClick?: (task: T) => void;
  onToggleComplete?: (task: T, completed: boolean) => void;
  onReschedule?: (task: T, newDueDate: string | null) => void;
  className?: string;
}

const PRIORITY_ICON_COLOR: Record<string, string> = {
  NONE: "text-muted-foreground",
  LOW: "text-info",
  MEDIUM: "text-warning",
  HIGH: "text-alert",
  URGENT: "text-error",
};

export function ScheduleTaskRow<T extends ScheduleTask | HomeTaskItem = ScheduleTask>({
  task,
  onTaskClick,
  onToggleComplete,
  onReschedule,
  className,
}: ScheduleTaskRowProps<T>) {
  const isCompleted =
    ("column" in task && task.column?.type === "COMPLETE") ||
    !!("completed_at" in task && task.completed_at) ||
    ("status" in task && task.status === "COMPLETE");

  const dueDate =
    "due_date" in task
      ? task.due_date
      : "dueDate" in task
        ? task.dueDate
        : null;

  const isOverdue =
    !!dueDate &&
    !isCompleted &&
    new Date(dueDate).setHours(0, 0, 0, 0) <
      new Date().setHours(0, 0, 0, 0);

  const shortId = "shortId" in task ? task.shortId : undefined;

  const boardName =
    ("board" in task && task.board?.name) ||
    ("column" in task && (task.column as { board?: { name?: string } })?.board?.name) ||
    ("projectName" in task && task.projectName
      ? `${task.projectName} / ${task.boardTitle}`
      : "boardTitle" in task
        ? task.boardTitle
        : undefined) ||
    "Board";

  const columnName =
    ("column" in task && task.column?.name) ||
    ("status" in task && task.status);

  const columnColor =
    ("column" in task && task.column?.color) || undefined;

  const assignee = "assignee" in task ? task.assignee : undefined;

  return (
    <div
      role="row"
      tabIndex={0}
      data-testid="schedule-task-row"
      data-task-id={task.id}
      data-task-short-id={shortId}
      onClick={() => onTaskClick?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick?.(task);
        }
      }}
      className={cn(
        "group flex flex-wrap items-center gap-x-3 gap-y-1.5 p-1.5 rounded-lg border border-border hover:border-border/80 hover:bg-muted/30 transition-all cursor-pointer select-none",
        isCompleted && "opacity-60 bg-muted/20 border-border/60",
        isOverdue && "border-error/30 bg-error/[0.04] hover:border-error/50",
        !isCompleted && !isOverdue && "bg-card shadow-xs",
        className
      )}
    >
      <div onClick={(e) => e.stopPropagation()} className="flex items-center pl-1.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => onToggleComplete?.(task, !!checked)}
          aria-label={`Mark ${task.title} as ${isCompleted ? "incomplete" : "complete"}`}
          data-testid="task-complete-checkbox"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
        {task.priority && task.priority !== "NONE" && (
          <span
            title={`Priority: ${task.priority.charAt(0)}${task.priority.slice(1).toLowerCase()}`}
            className={cn("shrink-0 flex items-center", PRIORITY_ICON_COLOR[task.priority])}
          >
            <HugeiconsIcon icon={Flag02Icon} strokeWidth={2} className="size-3.5" />
          </span>
        )}

        {shortId && (
          <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">
            {shortId}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick?.(task);
          }}
          className={cn(
            "text-sm font-medium text-left truncate hover:text-primary transition-colors cursor-pointer min-w-0",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden @sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border px-2 py-0.5 rounded-md max-w-[160px]">
          <span className="font-medium text-foreground/80 truncate">
            {boardName}
          </span>
          {columnName && (
            <>
              <span className="text-muted-foreground/60">/</span>
              {columnColor && (
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: columnColor }}
                />
              )}
              <span className="truncate">{columnName}</span>
            </>
          )}
        </div>

        {assignee && <UserAvatar user={assignee} size={5} />}

        <div onClick={(e) => e.stopPropagation()}>
          <QuickRescheduleMenu
            dueDate={dueDate}
            onReschedule={(newDueDate) => onReschedule?.(task, newDueDate)}
          />
        </div>
      </div>
    </div>
  );
}

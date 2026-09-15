"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Flag02Icon,
  Comment01Icon,
  CheckmarkSquare02Icon,
} from "@hugeicons/core-free-icons";
import type { ScheduleTask } from "@crwsync/types";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
import { QuickRescheduleMenu } from "@/components/schedules/QuickRescheduleMenu";
import { PRIORITY_STYLES } from "@/lib/kanban.utils";
import { cn } from "@/lib/utils";

export interface ScheduleTaskRowProps {
  task: ScheduleTask;
  onTaskClick?: (task: ScheduleTask) => void;
  onToggleComplete?: (task: ScheduleTask, completed: boolean) => void;
  onReschedule?: (task: ScheduleTask, newDueDate: string | null) => void;
  className?: string;
}

export function ScheduleTaskRow({
  task,
  onTaskClick,
  onToggleComplete,
  onReschedule,
  className,
}: ScheduleTaskRowProps) {
  const isCompleted = task.column?.type === "COMPLETE" || !!task.completed_at;
  const isOverdue =
    !!task.due_date &&
    !isCompleted &&
    new Date(task.due_date).setHours(0, 0, 0, 0) <
      new Date().setHours(0, 0, 0, 0);

  return (
    <div
      role="row"
      tabIndex={0}
      data-testid="schedule-task-row"
      data-task-id={task.id}
      data-task-short-id={task.shortId}
      onClick={() => onTaskClick?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick?.(task);
        }
      }}
      className={cn(
        "group flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-base-200 hover:border-base-300 hover:bg-base-200/50 transition-all cursor-pointer select-none",
        isCompleted && "opacity-60 bg-base-100/40",
        isOverdue && "border-error/30 bg-error/[0.03] hover:border-error/50",
        !isCompleted && !isOverdue && "bg-background",
        className
      )}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => onToggleComplete?.(task, !!checked)}
          aria-label={`Mark ${task.title} as ${isCompleted ? "incomplete" : "complete"}`}
          data-testid="task-complete-checkbox"
        />
      </div>

      <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider shrink-0">
        {task.shortId}
      </span>

      {task.priority && task.priority !== "NONE" && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full border capitalize shrink-0",
            PRIORITY_STYLES[task.priority]
          )}
        >
          <HugeiconsIcon icon={Flag02Icon} strokeWidth={2} className="size-3" />
          <span>{task.priority.toLowerCase()}</span>
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTaskClick?.(task);
        }}
        className={cn(
          "text-sm font-medium text-left truncate hover:text-primary transition-colors cursor-pointer flex-1 min-w-0",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </button>

      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-base-200/70 border border-base-300/50 px-2 py-0.5 rounded-md shrink-0 max-w-[200px] truncate">
        <span className="font-medium text-foreground/80 truncate">
          {task.board?.name || (task.column as { board?: { name?: string } })?.board?.name || "Board"}
        </span>
        <span className="text-muted-foreground/60">/</span>
        {task.column?.color && (
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: task.column.color }}
          />
        )}
        <span className="truncate">{task.column?.name}</span>
      </div>

      {!!task._count?.comments && task._count.comments > 0 && (
        <span
          className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0"
          title={`${task._count.comments} comments`}
        >
          <HugeiconsIcon
            icon={Comment01Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          <span>{task._count.comments}</span>
        </span>
      )}

      {!!task._count?.checklistItems && task._count.checklistItems > 0 && (
        <span
          className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0"
          title={`${task._count.checklistItems} checklist items`}
        >
          <HugeiconsIcon
            icon={CheckmarkSquare02Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          <span>{task._count.checklistItems}</span>
        </span>
      )}

      {task.assignee && <UserAvatar user={task.assignee} size={5} />}

      <div onClick={(e) => e.stopPropagation()}>
        <QuickRescheduleMenu
          dueDate={task.due_date}
          onReschedule={(newDueDate) => onReschedule?.(task, newDueDate)}
        />
      </div>
    </div>
  );
}

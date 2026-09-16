"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Flag02Icon } from "@hugeicons/core-free-icons";
import type { ScheduleTask } from "@crwsync/types";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
import { QuickRescheduleMenu } from "@/components/schedules/QuickRescheduleMenu";
import { cn } from "@/lib/utils";

export interface ScheduleTaskRowProps {
  task: ScheduleTask;
  onTaskClick?: (task: ScheduleTask) => void;
  onToggleComplete?: (task: ScheduleTask, completed: boolean) => void;
  onReschedule?: (task: ScheduleTask, newDueDate: string | null) => void;
  className?: string;
}

const PRIORITY_ICON_COLOR: Record<string, string> = {
  NONE: "text-muted-foreground",
  LOW: "text-info",
  MEDIUM: "text-warning",
  HIGH: "text-alert",
  URGENT: "text-error",
};

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
        "group flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 rounded-lg border border-border hover:border-border/80 hover:bg-muted/30 transition-all cursor-pointer select-none",
        isCompleted && "opacity-60 bg-muted/20 border-border/60",
        isOverdue && "border-error/30 bg-error/[0.04] hover:border-error/50",
        !isCompleted && !isOverdue && "bg-card shadow-xs",
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

      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
        {task.priority && task.priority !== "NONE" && (
          <span
            title={`Priority: ${task.priority.charAt(0)}${task.priority.slice(1).toLowerCase()}`}
            className={cn("shrink-0 flex items-center", PRIORITY_ICON_COLOR[task.priority])}
          >
            <HugeiconsIcon icon={Flag02Icon} strokeWidth={2} className="size-3.5" />
          </span>
        )}

        <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">
          {task.shortId}
        </span>

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

        {task.assignee && <UserAvatar user={task.assignee} size={5} />}

        <div onClick={(e) => e.stopPropagation()}>
          <QuickRescheduleMenu
            dueDate={task.due_date}
            onReschedule={(newDueDate) => onReschedule?.(task, newDueDate)}
          />
        </div>
      </div>
    </div>
  );
}

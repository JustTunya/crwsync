"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Flag02Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  Attachment01Icon,
  Task01Icon,
  Calendar04Icon,
} from "@hugeicons/core-free-icons";
import { HomeTaskItem, TaskPriorityEnum } from "@crwsync/types";
import { QuickRescheduleMenu } from "@/components/schedules/QuickRescheduleMenu";
import { PRIORITY_STYLES, DEADLINE_STYLES, formatChipDate } from "@/lib/kanban.utils";
import { cn } from "@/lib/utils";

export interface HomeTaskRowProps {
  task: HomeTaskItem;
  slug: string;
  onSelectTask?: (task: HomeTaskItem) => void;
  onToggleComplete?: (task: HomeTaskItem) => void;
  onReschedule?: (task: HomeTaskItem, newDueDate: string | null) => void;
  className?: string;
}

function formatPriorityLabel(priority: TaskPriorityEnum) {
  return `${priority.charAt(0)}${priority.slice(1).toLowerCase()}`;
}

export function HomeTaskRow({
  task,
  onSelectTask,
  onToggleComplete,
  onReschedule,
  className,
}: HomeTaskRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="home-task-row"
      data-task-id={task.id}
      onClick={() => onSelectTask?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectTask?.(task);
        }
      }}
      className={cn(
        "group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-base-200/70 bg-card/60 hover:bg-base-200/40 hover:border-base-300 transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          data-testid="home-task-toggle"
          aria-label={`Mark ${task.title} as complete`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.(task);
          }}
          className="size-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0 group/btn"
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className="size-3 text-primary opacity-0 group-hover/btn:opacity-100 transition-opacity"
          />
        </button>

        <span
          className={cn(
            "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0",
            PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.NONE
          )}
        >
          <HugeiconsIcon icon={Flag02Icon} strokeWidth={2} className="size-3" />
          {formatPriorityLabel(task.priority)}
        </span>

        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
          {task.title}
        </span>

        <span className="text-[11px] font-medium text-muted-foreground bg-base-200/80 px-2 py-0.5 rounded-md truncate max-w-[140px]">
          {task.projectName ? `${task.projectName} / ${task.boardTitle}` : task.boardTitle}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.checklistTotal > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Task01Icon} className="size-3.5" />
            {task.checklistCompleted}/{task.checklistTotal}
          </span>
        )}

        {task.commentsCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Comment01Icon} className="size-3.5" />
            {task.commentsCount}
          </span>
        )}

        {task.attachmentsCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Attachment01Icon} className="size-3.5" />
            {task.attachmentsCount}
          </span>
        )}

        <div onClick={(e) => e.stopPropagation()}>
          <QuickRescheduleMenu
            dueDate={task.dueDate}
            onReschedule={(date) => onReschedule?.(task, date)}
            trigger={
              task.dueDate ? (
                <button
                  type="button"
                  data-testid="home-task-due-chip"
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border cursor-pointer",
                    DEADLINE_STYLES(task.dueDate)
                  )}
                >
                  <HugeiconsIcon icon={Calendar04Icon} strokeWidth={2} className="size-3" />
                  {formatChipDate(task.dueDate)}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="home-task-add-date"
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border border-dashed border-base-300 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                >
                  + Date
                </button>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

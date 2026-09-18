"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Flag02Icon,
  CheckmarkSquare02Icon,
  Comment01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
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
  NONE: "text-muted-foreground/40",
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
    !!("completedAt" in task && task.completedAt) ||
    ("columnType" in task && task.columnType === "COMPLETE") ||
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
    ("boardTitle" in task ? task.boardTitle : undefined) ||
    "Board";

  const projectName = "projectName" in task ? task.projectName : undefined;
  const fullBoardContext = projectName ? `${projectName} / ${boardName}` : boardName;

  const columnName =
    ("column" in task && task.column?.name) ||
    ("status" in task && task.status);

  const columnColor =
    ("column" in task && task.column?.color) ||
    ("columnColor" in task && task.columnColor) ||
    undefined;

  const assignee = "assignee" in task ? task.assignee : undefined;

  const checklistTotal = "checklistTotal" in task ? task.checklistTotal : 0;
  const checklistCompleted = "checklistCompleted" in task ? task.checklistCompleted : 0;
  const checklistCount =
    checklistTotal > 0
      ? `${checklistCompleted}/${checklistTotal}`
      : "_count" in task && task._count?.checklistItems
        ? `${task._count.checklistItems}`
        : null;

  const commentsCount =
    "commentsCount" in task
      ? task.commentsCount
      : "_count" in task && task._count?.comments
        ? task._count.comments
        : 0;

  const attachmentsCount = "attachmentsCount" in task ? task.attachmentsCount : 0;

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
        "group flex items-center gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border transition-all cursor-pointer select-none text-left",
        isCompleted && "opacity-60 bg-muted/20 border-border/60",
        isOverdue && "border-error/30 bg-error/[0.04] hover:border-error/50",
        !isCompleted && !isOverdue && "bg-card border-border hover:border-border/80 hover:bg-muted/30 shadow-xs",
        className
      )}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.(task, !isCompleted);
        }}
        className="shrink-0 flex items-center justify-center p-0.5 cursor-pointer"
      >
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => onToggleComplete?.(task, !!checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Mark ${task.title} as ${isCompleted ? "incomplete" : "complete"}`}
          data-testid="task-complete-checkbox"
          className="cursor-pointer"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.priority && task.priority !== "NONE" && (
            <span
              title={`Priority: ${task.priority.charAt(0)}${task.priority.slice(1).toLowerCase()}`}
              className={cn("shrink-0 flex items-center", PRIORITY_ICON_COLOR[task.priority])}
            >
              <HugeiconsIcon icon={Flag02Icon} strokeWidth={2} className="size-3.5" />
            </span>
          )}

          {shortId && (
            <span className="text-[11px] font-mono font-medium text-muted-foreground/70 shrink-0">
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

          <div className="hidden sm:flex items-center gap-2 shrink-0 ml-1">
            {checklistCount && (
              <span
                title={`Checklist: ${checklistCount}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
              >
                <HugeiconsIcon icon={CheckmarkSquare02Icon} strokeWidth={2} className="size-3 text-muted-foreground" />
                <span>{checklistCount}</span>
              </span>
            )}

            {commentsCount > 0 && (
              <span
                title={`Comments: ${commentsCount}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
              >
                <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} className="size-3 text-muted-foreground" />
                <span>{commentsCount}</span>
              </span>
            )}

            {attachmentsCount > 0 && (
              <span
                title={`Attachments: ${attachmentsCount}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
              >
                <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-3 text-muted-foreground" />
                <span>{attachmentsCount}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <span className="font-medium text-foreground/75 truncate max-w-[180px] sm:max-w-[260px]" title={fullBoardContext}>
            {fullBoardContext}
          </span>

          {columnName && (
            <>
              <span className="text-muted-foreground/40 shrink-0">/</span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground/80 truncate max-w-[140px]" title={`Status: ${columnName}`}>
                {columnColor && (
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: columnColor }}
                  />
                )}
                <span className="truncate">{columnName}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2 sm:gap-2.5">
        {assignee && <UserAvatar user={assignee} size={5} />}

        <div onClick={(e) => e.stopPropagation()} className="w-24 sm:w-28 flex justify-end shrink-0">
          <QuickRescheduleMenu
            dueDate={dueDate}
            onReschedule={(newDueDate) => onReschedule?.(task, newDueDate)}
          />
        </div>
      </div>
    </div>
  );
}

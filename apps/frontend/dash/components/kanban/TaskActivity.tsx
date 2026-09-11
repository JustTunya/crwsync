"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowRight02Icon, Calendar04Icon, Flag02Icon, UserIcon, TimeScheduleIcon } from "@hugeicons/core-free-icons";
import { TaskActivityTypeEnum, type Task, type TaskActivity as TaskActivityEntry } from "@crwsync/types";
import { useTaskActivity, useLoadOlderActivity } from "@/hooks/use-task-activity";
import { cn } from "@/lib/utils";

export interface TaskActivityProps {
  task: Task;
  workspaceId: string;
}

const TYPE_ICON: Record<TaskActivityTypeEnum, HugeiconsIconProps["icon"]> = {
  [TaskActivityTypeEnum.COLUMN_MOVED]: ArrowRight02Icon,
  [TaskActivityTypeEnum.PRIORITY_CHANGED]: Flag02Icon,
  [TaskActivityTypeEnum.ASSIGNEE_CHANGED]: UserIcon,
  [TaskActivityTypeEnum.DUE_DATE_CHANGED]: Calendar04Icon,
};

function describe(activity: TaskActivityEntry): string {
  const m = activity.metadata;
  switch (activity.type) {
    case TaskActivityTypeEnum.COLUMN_MOVED:
      return `moved this task from ${m.fromColumnName ?? "another column"} to ${m.toColumnName}`;
    case TaskActivityTypeEnum.PRIORITY_CHANGED:
      return `changed priority from ${(m.from ?? "none").toLowerCase()} to ${(m.to ?? "none").toLowerCase()}`;
    case TaskActivityTypeEnum.ASSIGNEE_CHANGED:
      if (!m.fromUserId && m.toUserId) return `assigned ${m.toUserName}`;
      if (m.fromUserId && !m.toUserId) return `unassigned ${m.fromUserName}`;
      return `reassigned from ${m.fromUserName} to ${m.toUserName}`;
    case TaskActivityTypeEnum.DUE_DATE_CHANGED: {
      const to = m.to ? format(new Date(m.to), "MMM d, yyyy") : null;
      if (!m.from && to) return `set the deadline to ${to}`;
      if (m.from && !to) return "removed the deadline";
      return `changed the deadline to ${to}`;
    }
    default:
      return "updated this task";
  }
}

export function TaskActivity({ task, workspaceId }: TaskActivityProps) {
  const [open, setOpen] = useState(false);
  const { data: page } = useTaskActivity(workspaceId, task.id);
  const loadOlder = useLoadOlderActivity(workspaceId, task.id);

  const activities = page?.activities ?? [];

  return (
    <div className="pt-4 mt-4 border-t border-base-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 cursor-pointer group/activity"
      >
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")}
        />
        <span className="text-xs text-muted-foreground group-hover/activity:text-foreground transition-colors">
          Activity{activities.length > 0 ? ` (${activities.length})` : ""}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {page?.has_more && (
            <button
              type="button"
              onClick={() => page.next_cursor && loadOlder.mutate(page.next_cursor)}
              disabled={loadOlder.isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start disabled:opacity-50"
            >
              {loadOlder.isPending ? "Loading..." : "Load older activity"}
            </button>
          )}

          {activities.length === 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
              <HugeiconsIcon icon={TimeScheduleIcon} strokeWidth={1.75} className="size-3.5 shrink-0" />
              No activity recorded yet
            </p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5">
                <div className="size-6 shrink-0 rounded-full bg-base-200 flex items-center justify-center mt-0.5">
                  <HugeiconsIcon icon={TYPE_ICON[activity.type]} strokeWidth={2} className="size-3 text-muted-foreground" />
                </div>
                <p className="text-xs leading-snug text-muted-foreground pt-1">
                  <span className="font-medium text-foreground">
                    {activity.actor ? `${activity.actor.firstname} ${activity.actor.lastname}` : "Someone"}
                  </span>{" "}
                  {describe(activity)}
                  {" · "}
                  <span title={format(new Date(activity.created_at), "MMM d, yyyy h:mm a")}>
                    {formatDistanceToNowStrict(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

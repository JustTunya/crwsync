"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Calendar04Icon, Flag02Icon } from "@hugeicons/core-free-icons";
import type { Task } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";
import { ReadOnlyDescription } from "@/components/kanban/RichTextEditor";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { PRIORITY_STYLES, DEADLINE_STYLES, formatChipDate } from "@/lib/kanban.utils";
import { cn } from "@/lib/utils";

export function KanbanTask({ task, onClick, workspaceId }: { task: Task; onClick: () => void; workspaceId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: "task", task } });
  const style = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1, transition, };
  
  const { data: members } = useWorkspaceMembers(workspaceId);
  const assignee = members?.find((m) => m.user_id === task.assignee_id)?.user;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
        if (listeners?.onKeyDown) {
          listeners.onKeyDown(e);
        }
      }}
      style={style}
      role="button"
      tabIndex={0}
      className="bg-background dark:bg-base-200 rounded-lg p-3 border-[1.5px] border-base-200 dark:border-base-300 hover:border-base-300 transition-colors cursor-grab active:cursor-grabbing"
    >
      <p className="text-[10px] text-muted-foreground font-medium mb-1 tracking-wider uppercase">{task.shortId}</p>
      <h3 className="text-sm text-foreground font-medium leading-tight truncate">{task.title}</h3>
      {task.description && (
        <div className="mt-2"><ReadOnlyDescription content={task.description} /></div>
      )}
      <div className={cn(
        "flex items-center justify-between",
        (task.priority && task.priority !== "NONE" || task.due_date || task.labels?.length || (task.assignee_id && assignee)) && "mt-4"
      )}>
        <div className="flex items-center gap-2">
          {task.priority && task.priority !== "NONE" && (
            <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
          )}
          {task.due_date && (
            <Chip icon={Calendar04Icon} label={formatChipDate(task.due_date)} className={DEADLINE_STYLES(task.due_date)} />
          )}
          {task.labels && task.labels.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.labels.length} label{task.labels.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {task.assignee_id && assignee && (
          <UserAvatar user={assignee} size={6} />
        )}
      </div>
    </div>
  );
}

export function KanbanTaskOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-background dark:bg-base-200 rounded-lg p-3 border-[1.5px] border-base-200 dark:border-base-300 shadow-lg shadow-primary/10 rotate-2 cursor-grabbing">
      <p className="text-sm font-medium mb-2">{task.title}</p>
      <div className="flex items-center gap-2">
        {task.priority && task.priority !== "NONE" && (
          <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
        )}
      </div>
    </div>
  );
}

export function Chip({ icon, label, className }: { icon: HugeiconsIconProps["icon"], label: string, className: string }) {
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium capitalize border-[1.25px] px-1.5 py-0.5 rounded-full", className)}>
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3" />
      {label.toLowerCase()}
    </span>
  );
}

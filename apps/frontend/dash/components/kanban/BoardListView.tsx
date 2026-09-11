"use client";

import { Flag02Icon, Calendar04Icon } from "@hugeicons/core-free-icons";
import type { BoardColumn, Task } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { PRIORITY_STYLES, DEADLINE_STYLES, formatChipDate } from "@/lib/kanban.utils";
import { Chip } from "@/components/kanban/KanbanTask";
import { cn } from "@/lib/utils";

interface BoardListViewProps {
  columns: BoardColumn[];
  workspaceId: string;
  onTaskClick: (task: Task) => void;
}

export function BoardListView({ columns, workspaceId, onTaskClick }: BoardListViewProps) {
  const { data: members } = useWorkspaceMembers(workspaceId);
  const rows = columns.flatMap((col) => (col.tasks ?? []).map((task) => ({ task, column: col })));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="text-left text-xs text-muted-foreground border-b border-base-200">
            <th className="font-medium py-2 px-3">Title</th>
            <th className="font-medium py-2 px-3">Status</th>
            <th className="font-medium py-2 px-3">Priority</th>
            <th className="font-medium py-2 px-3">Due date</th>
            <th className="font-medium py-2 px-3">Labels</th>
            <th className="font-medium py-2 px-3">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ task, column }) => {
            const assignee = members?.find((m) => m.user_id === task.assignee_id)?.user;
            return (
              <tr
                key={task.id}
                data-testid="board-list-row"
                onClick={() => onTaskClick(task)}
                className="cursor-pointer hover:bg-base-200/60 transition-colors border-b border-base-200"
              >
                <td className="py-2 px-3 max-w-xs">
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">{task.shortId}</p>
                  <p className="font-medium truncate">{task.title}</p>
                </td>
                <td className="py-2 px-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {column.color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />}
                    {column.name}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {task.priority && task.priority !== "NONE" ? (
                    <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {task.due_date ? (
                    <Chip icon={Calendar04Icon} label={formatChipDate(task.due_date)} className={DEADLINE_STYLES(task.due_date)} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {task.labels && task.labels.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {task.labels.map((label) => (
                        <span key={label} className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full border-[1.25px] border-muted-foreground/40 text-muted-foreground")}>
                          {label}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {assignee ? <UserAvatar user={assignee} size={6} /> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

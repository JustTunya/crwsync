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

// Priority chip content is bounded ("urgent" is the longest value) and the due
// date chip is a fixed "MMM d" format, so both columns get a tight fixed width
// and the space that frees up goes to status/labels instead.
const GRID_TEMPLATE = "minmax(160px,1.8fr) minmax(120px,0.8fr) minmax(96px,0.4fr) minmax(92px,0.4fr) minmax(140px,0.8fr) 56px";
const MAX_VISIBLE_LABELS = 2;

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
    <div className="overflow-auto h-full">
      <div className="min-w-[664px]" role="table">
        <div
          role="row"
          className="grid sticky top-0 bg-background z-10 text-left text-xs text-muted-foreground border-b border-base-200"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
          <div role="columnheader" className="font-medium py-2 px-3">Title</div>
          <div role="columnheader" className="font-medium py-2 px-3">Status</div>
          <div role="columnheader" className="font-medium py-2 px-3">Priority</div>
          <div role="columnheader" className="font-medium py-2 px-3">Due date</div>
          <div role="columnheader" className="font-medium py-2 px-3">Labels</div>
          <div role="columnheader" className="font-medium py-2 px-3">Assignee</div>
        </div>
        <div role="rowgroup">
          {rows.map(({ task, column }) => {
            const assignee = members?.find((m) => m.user_id === task.assignee_id)?.user;
            const visibleLabels = task.labels?.slice(0, MAX_VISIBLE_LABELS) ?? [];
            const hiddenLabelCount = (task.labels?.length ?? 0) - visibleLabels.length;
            return (
              <div
                key={task.id}
                role="row"
                data-testid="board-list-row"
                onClick={() => onTaskClick(task)}
                className="grid items-center cursor-pointer hover:bg-base-200/60 transition-colors border-b border-base-200"
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
              >
                <div role="cell" className="py-2 px-3 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase truncate">{task.shortId}</p>
                  <p className="font-medium truncate">{task.title}</p>
                </div>
                <div role="cell" className="py-2 px-3 min-w-0">
                  <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                    {column.color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />}
                    <span className="truncate">{column.name}</span>
                  </span>
                </div>
                <div role="cell" className="py-2 px-3">
                  {task.priority && task.priority !== "NONE" ? (
                    <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div role="cell" className="py-2 px-3">
                  {task.due_date ? (
                    <Chip icon={Calendar04Icon} label={formatChipDate(task.due_date)} className={DEADLINE_STYLES(task.due_date)} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div role="cell" className="py-2 px-3 min-w-0">
                  {visibleLabels.length > 0 ? (
                    <span className="flex items-center gap-1 min-w-0">
                      {visibleLabels.map((label) => (
                        <span
                          key={label}
                          className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded-full border-[1.25px] border-muted-foreground/40 text-muted-foreground truncate shrink min-w-0 max-w-[80px]"
                          )}
                        >
                          {label}
                        </span>
                      ))}
                      {hiddenLabelCount > 0 && (
                        <span className="text-xs font-medium text-muted-foreground shrink-0">+{hiddenLabelCount}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div role="cell" className="py-2 px-3">
                  {assignee ? <UserAvatar user={assignee} size={6} /> : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

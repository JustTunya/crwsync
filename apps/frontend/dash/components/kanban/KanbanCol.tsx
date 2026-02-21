"use client";

import { useState, useRef, useEffect } from "react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MoreHorizontalIcon, FileEmpty02Icon } from "@hugeicons/core-free-icons";
import type { Task, BoardColumn } from "@crwsync/types";
import { useUpdateColumn, useDeleteColumn } from "@/hooks/use-boards";
import { cn } from "@/lib/utils";

import { COLUMN_COLORS } from "../../lib/kanban.utils";
import { KanbanTask } from "./KanbanTask";

export interface KanbanColProps {
  column: BoardColumn;
  taskIds: string[];
  workspaceId: string;
  boardId: string;
  onAddTask: () => void;
  addingTask: boolean;
  taskTitle: string;
  setTaskTitle: (v: string) => void;
  onCreateTask: () => void;
  onCancelTask: () => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanCol({ column, taskIds, workspaceId, boardId, onAddTask, addingTask, taskTitle, setTaskTitle, onCreateTask, onCancelTask, onTaskClick }: KanbanColProps) {
  const updateColumn = useUpdateColumn(workspaceId, boardId);
  const deleteColumn = useDeleteColumn(workspaceId, boardId);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handleRename = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== column.name) {
      await updateColumn.mutateAsync({
        columnId: column.id,
        data: { name: trimmed },
      });
    } else {
      setEditName(column.name);
    }
    setEditing(false);
  };

  const handleColorChange = async (color: string) => {
    await updateColumn.mutateAsync({ columnId: column.id, data: { color } });
    setShowMenu(false);
  };

  const handleDeleteColumn = async () => {
    setShowMenu(false);
    await deleteColumn.mutateAsync(column.id);
  };

  const { setNodeRef } = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
    disabled: true,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-3 w-xs p-3 bg-base-100 rounded-xl shrink-0"
    >
      <div className="flex flex-row items-center justify-between p-1 rounded-lg">
        <div className="flex items-center gap-2">
          {column.color && (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: column.color }}
            />
          )}
          {editing ? (
            <input
              type="text"
              ref={(input) => {
                if (input && editing) input.focus();
              }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditName(column.name);
                  setEditing(false);
                }
              }}
              onBlur={handleRename}
              className="text-sm font-medium bg-transparent outline-none w-full"
            />
          ) : (
            <h3
              className="text-sm font-medium truncate cursor-pointer"
              onDoubleClick={() => {
                setEditName(column.name);
                setEditing(true);
              }}
            >
              {column.name}
            </h3>
          )}
          {!editing && (
            <span className="text-xs text-muted-foreground shrink-0">
              {column.tasks?.length || 0}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative" ref={menuRef}>
            <div className="flex items-center gap-1">
              <button type="button" title="Add task" onClick={onAddTask}>
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-4.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                />
              </button>
              <button type="button" title="More" onClick={() => setShowMenu(!showMenu)}>
                <HugeiconsIcon
                  icon={MoreHorizontalIcon}
                  className="size-4.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                />
              </button>
            </div>
            {showMenu && (
              <div className="absolute right-0 top-6 flex flex-col gap-1 z-30 min-w-34 p-2 bg-base-100 border border-base-200 rounded-lg shadow-lg">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Color
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {COLUMN_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(`var(--label-${color})`)}
                        style={{ backgroundColor: `var(--label-${color})` }}
                        className={cn(
                          "size-5 mx-auto rounded-full hover:scale-110 transition-transform cursor-pointer",
                          { "ring-2 ring-primary ring-offset-1 ring-offset-base-100": column.color === `var(--label-${color})` },
                        )}
                      />
                    ))}
                    <button
                      onClick={() => handleColorChange("")}
                      className={cn(
                        "flex items-center justify-center size-5 mx-auto rounded-full border border-base-300 hover:scale-110 transition-transform cursor-pointer",
                        { "ring-2 ring-primary ring-offset-1 ring-offset-base-100": !column.color },
                      )}
                    >
                      <div className="w-full h-px bg-base-300 -rotate-45" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-px bg-base-200 rounded-full my-0.5" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    setEditName(column.name);
                    setEditing(true);
                  }}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-base-200 rounded-md transition-colors cursor-pointer"
                >
                  Rename
                </button>
                <button
                  onClick={handleDeleteColumn}
                  className="w-full px-2 py-1 text-xs text-left text-error hover:bg-base-200 rounded-md transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {column.tasks && column.tasks.length > 0 ? (
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 flex-1 min-h-10">
            {column.tasks?.map((task) => (
              <KanbanTask
                key={task.id}
                task={task}
                workspaceId={workspaceId}
                onClick={() => onTaskClick(task)}
              />
            ))}
            {addingTask && (
              <div className="bg-base-100 rounded-lg p-3 border border-primary/50">
                <input
                  ref={(input) => {
                    if (input && addingTask) input.focus();
                  }}
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateTask();
                    if (e.key === "Escape") onCancelTask();
                  }}
                  onBlur={() => {
                    if (!taskTitle.trim()) onCancelTask();
                  }}
                  placeholder="Task title..."
                  className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
          </div>
        </SortableContext>
      ) : (
        <div className="flex flex-col gap-2 flex-1 min-h-10">
          {addingTask ? (
            <div className="bg-base-100 rounded-lg p-3 border border-primary/50">
              <input
                ref={(input) => {
                  if (input && addingTask) input.focus();
                }}
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateTask();
                  if (e.key === "Escape") onCancelTask();
                }}
                onBlur={() => {
                  if (!taskTitle.trim()) onCancelTask();
                }}
                placeholder="Task title..."
                className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 h-full">
              <HugeiconsIcon
                icon={FileEmpty02Icon}
                className="size-12 text-base-300"
              />
              <p className="text-sm text-base-300 font-semibold">
                No tasks currently
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

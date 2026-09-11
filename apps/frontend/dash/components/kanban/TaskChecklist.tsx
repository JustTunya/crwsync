"use client";

import { useState, KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, CheckmarkSquare02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import type { Task, TaskChecklistItem } from "@crwsync/types";
import { useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from "@/hooks/use-boards";
import { cn } from "@/lib/utils";

export interface TaskChecklistProps {
  task: Task;
  workspaceId: string;
  boardId: string;
}

export function TaskChecklist({ task, workspaceId, boardId }: TaskChecklistProps) {
  const createItem = useCreateChecklistItem(workspaceId, boardId);
  const updateItem = useUpdateChecklistItem(workspaceId, boardId);
  const deleteItem = useDeleteChecklistItem(workspaceId, boardId);
  const [newItem, setNewItem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const items = task.checklistItems ?? [];
  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const handleAdd = () => {
    const content = newItem.trim();
    if (!content) return;
    createItem.mutate({ taskId: task.id, data: { content } });
    setNewItem("");
  };

  const handleToggle = (item: TaskChecklistItem) => {
    updateItem.mutate({ taskId: task.id, itemId: item.id, data: { is_completed: !item.is_completed } });
  };

  const startEdit = (item: TaskChecklistItem) => {
    setEditingId(item.id);
    setEditValue(item.content);
  };

  const commitEdit = (item: TaskChecklistItem) => {
    const content = editValue.trim();
    setEditingId(null);
    if (!content || content === item.content) return;
    updateItem.mutate({ taskId: task.id, itemId: item.id, data: { content } });
  };

  const handleDelete = (item: TaskChecklistItem) => {
    deleteItem.mutate({ taskId: task.id, itemId: item.id });
  };

  return (
    <div className="pt-4 mt-4 border-t border-base-200">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-muted-foreground">Checklist</label>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-1 w-full bg-base-200 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-base-200 transition-colors"
          >
            <button
              type="button"
              onClick={() => handleToggle(item)}
              title={item.is_completed ? "Mark incomplete" : "Mark complete"}
              className="shrink-0 size-4 inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {item.is_completed ? (
                <HugeiconsIcon icon={CheckmarkSquare02Icon} strokeWidth={2} className="size-4 text-primary" />
              ) : (
                <span className="block size-[13px] rounded-[3.5px] border-[1.5px] border-current" />
              )}
            </button>

            {editingId === item.id ? (
              <input
                type="text"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(item)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") commitEdit(item);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 min-w-0 bg-transparent text-sm text-foreground outline-none border-b border-primary"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(item)}
                className={cn(
                  "flex-1 min-w-0 text-left text-sm truncate cursor-text",
                  item.is_completed ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {item.content}
              </button>
            )}

            <button
              type="button"
              title="Delete item"
              onClick={() => handleDelete(item)}
              className="shrink-0 size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-error hover:bg-base-100 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add an item..."
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>
    </div>
  );
}

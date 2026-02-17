"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { format } from "date-fns";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Add01Icon, Calendar04Icon, Cancel01Icon, Delete02Icon, FileEmpty02Icon, Flag02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import type { Task, BoardColumn } from "@crwsync/types";
import { useUpdateColumn, useDeleteColumn, useUpdateTask, useDeleteTask } from "@/hooks/use-boards";
import { cn } from "@/lib/utils";
import { DatePickerTime } from "./ui/date-picker";
import { Input } from "./ui/input";

// TODO: replace placeholder values
// !=======================================!
const COLUMN_COLORS = [
  "#71717a", // zinc-500
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#f43f5e", // rose-500
];

enum TaskPriorityEnum {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

const PRIORITY_STYLES: Record<string, string> = {
  NONE: "text-muted-foreground bg-muted-foreground/10 border-muted-foreground/75",
  LOW: "text-info bg-info/10 border-info/75",
  MEDIUM: "text-warning bg-warning/10 border-warning/75",
  HIGH: "text-error bg-error/10 border-error/75",
  URGENT: "text-error bg-error/10 border-error/75",
};

const DEADLINE_STYLES = (date: string): string => {
  const today = new Date();
  const deadline = new Date(date);
  const diff = deadline.getTime() - today.getTime();
  if (diff < 0) {
    // EXPIRED
    return "text-error bg-error/10 border-error/75";
  }
  if (diff < 24 * 60 * 60 * 1000) {
    // TODAY
    return "text-warning bg-warning/10 border-warning/75";
  }
  if (diff < 2 * 24 * 60 * 60 * 1000) {
    // TOMORROW
    return "text-info bg-info/10 border-info/75";
  }
  // LATER
  return "text-muted-foreground bg-muted-foreground/10 border-muted-foreground/75";
}
// !=======================================!

export function KanbanTask({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: "task", task } });
  const style = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1, transition, };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={style}
      className="bg-background space-y-2 dark:bg-base-200 rounded-lg p-3 border-[1.5px] border-base-200 dark:border-base-300 hover:border-base-300 transition-colors cursor-grab active:cursor-grabbing"
    >
      <h3 className="text-sm text-foreground font-medium leading-tight truncate">{task.title}</h3>
      <p className="text-sm text-muted-foreground leading-tight truncate">{task.description}</p>
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
    </div>
  );
}

export function KanbanTaskOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-background dark:bg-base-200 rounded-lg p-3 border-[1.5px] border-base-200 dark:border-base-300 shadow-lg shadow-primary/10 rotate-2 cursor-grabbing">
      <p className="text-sm font-medium mb-1">{task.title}</p>
      <div className="flex items-center gap-2">
        {task.priority && task.priority !== "NONE" && (
          <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
        )}
      </div>
    </div>
  );
}

interface KanbanColProps {
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
  taskInputRef: React.RefObject<HTMLInputElement | null>;
  onTaskClick: (task: Task) => void;
}

export function KanbanCol({ column, taskIds, workspaceId, boardId, onAddTask, addingTask, taskTitle, setTaskTitle, onCreateTask, onCancelTask, taskInputRef, onTaskClick }: KanbanColProps) {
  const updateColumn = useUpdateColumn(workspaceId, boardId);
  const deleteColumn = useDeleteColumn(workspaceId, boardId);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  const editRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

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
              ref={editRef}
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
              <HugeiconsIcon
                icon={Add01Icon}
                className="size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={onAddTask}
              />
              <HugeiconsIcon
                icon={MoreHorizontalIcon}
                className="size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={() => setShowMenu(!showMenu)}
              />
            </div>
            {showMenu && (
              <div className="absolute right-0 top-6 z-30 bg-base-100 border border-base-200 rounded-lg shadow-lg p-1 min-w-40 flex flex-col gap-1">
                <div className="px-2 py-1.5 border-b border-base-200 mb-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Color
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {COLUMN_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        style={{ backgroundColor: color }}
                        className={cn(
                          "size-5 rounded-full hover:scale-110 transition-transform cursor-pointer",
                          {
                            "ring-2 ring-primary ring-offset-1 ring-offset-base-100":
                              column.color === color,
                          },
                        )}
                      />
                    ))}
                    <button
                      onClick={() => handleColorChange("")}
                      className={cn(
                        "flex items-center justify-center size-5 rounded-full border border-base-300 hover:scale-110 transition-transform cursor-pointer",
                        {
                          "ring-2 ring-primary ring-offset-1 ring-offset-base-100":
                            !column.color,
                        },
                      )}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setEditName(column.name);
                    setEditing(true);
                  }}
                  className="w-full px-2 py-1.5 text-xs text-left hover:bg-base-200 rounded-md transition-colors cursor-pointer"
                >
                  Rename
                </button>
                <button
                  onClick={handleDeleteColumn}
                  className="w-full px-2 py-1.5 text-xs text-left text-error hover:bg-base-200 rounded-md transition-colors cursor-pointer"
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
                onClick={() => onTaskClick(task)}
              />
            ))}
            {addingTask && (
              <div className="bg-base-100 rounded-lg p-3 border border-primary/50">
                <input
                  ref={taskInputRef}
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
                ref={taskInputRef}
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

export interface TaskDetailModalProps {
  task: Task;
  workspaceId: string;
  boardId: string;
  onClose: () => void;
}

export function TaskDetailModal({ task, workspaceId, boardId, onClose }: TaskDetailModalProps) {
  const updateTask = useUpdateTask(workspaceId, boardId);
  const deleteTask = useDeleteTask(workspaceId, boardId);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriorityEnum>(
    (task.priority as TaskPriorityEnum) || TaskPriorityEnum.NONE,
  );
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    await updateTask
      .mutateAsync({
        taskId: task.id,
        data: {
          title: title.trim() || task.title,
          description: description.trim() || undefined,
          priority: priority,
          due_date: deadline ? new Date(deadline).toISOString() : null,
          labels: labels,
        },
      })
      .finally(() => {
        setSaving(false);
        onClose();
      });
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-lg p-6 max-w-lg w-full mx-4 border border-base-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Edit Task Details</h2>
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Delete02Icon}
              className="size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={handleDelete}
            />
            <HugeiconsIcon
              icon={Cancel01Icon}
              className="size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={onClose}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a description..."
              className="w-full px-3 py-2 text-sm bg-base-200 rounded-lg border-[1.5px] border-base-300 focus:border-primary focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Deadline
            </label>
            <DatePickerTime date={deadline} setDate={setDeadline} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Priority
            </label>
            <div className="flex gap-2">
              {Object.values(TaskPriorityEnum).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer capitalize ${
                    priority === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-200 hover:border-base-300 text-muted-foreground"
                  }`}
                >
                  {p.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {labels.map((label, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-base-200 rounded-md text-foreground"
                >
                  {label}
                  <button
                    onClick={() => setLabels(labels.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
            <Input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && labelInput.trim()) {
                  e.preventDefault();
                  if (!labels.includes(labelInput.trim())) {
                    setLabels([...labels, labelInput.trim()]);
                  }
                  setLabelInput("");
                }
              }}
              placeholder="Type a label and press Enter..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, className }: { icon: HugeiconsIconProps["icon"], label: string, className: string }) {
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium capitalize border-[1.25px] px-1.5 py-0.5 rounded-full", className)}>
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3" />
      {label.toLowerCase()}
    </span>
  );
}

function formatChipDate(date: string) {
  return format(new Date(date), "MMM d"); // example: "Jan 1"
}
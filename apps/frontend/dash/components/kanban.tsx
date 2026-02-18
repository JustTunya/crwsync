"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { format } from "date-fns";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Add01Icon, Calendar04Icon, Cancel01Icon, Delete02Icon, FileEmpty02Icon, Flag02Icon, MoreHorizontalIcon, UserIcon, TextBoldIcon, TextItalicIcon, TextUnderlineIcon, LeftToRightListNumberIcon, Image01Icon, LeftToRightListBulletIcon, Link02Icon } from "@hugeicons/core-free-icons";
import type { Task, BoardColumn } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";
import { DatePickerTime } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUpdateColumn, useDeleteColumn, useUpdateTask, useDeleteTask } from "@/hooks/use-boards";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";

// TODO: replace placeholder values
// !=======================================!
const COLUMN_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink"];

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
  HIGH: "text-alert bg-alert/10 border-alert/75",
  URGENT: "text-error bg-error/10 border-error/75",
};

const DEADLINE_STYLES = (date: string): string => {
  const today = new Date().setHours(0, 0, 0, 0);
  const deadline = new Date(date).setHours(0, 0, 0, 0);
  const diff = deadline - today;
  
  if (diff < 0) { // EXPIRED
    return "text-error bg-error/10 border-error/75";
  }
  if (diff < 24 * 60 * 60 * 1000) { // TODAY
    return "text-alert bg-alert/10 border-alert/75";
  }
  if (diff < 2 * 24 * 60 * 60 * 1000) { // TOMORROW
    return "text-warning bg-warning/10 border-warning/75";
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) { // THIS WEEK
    return "text-info bg-info/10 border-info/75";
  }
  return "text-muted-foreground bg-muted-foreground/10 border-muted-foreground/75"; // LATER
}
// !=======================================!

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
      style={style}
      className="bg-background dark:bg-base-200 rounded-lg p-3 border-[1.5px] border-base-200 dark:border-base-300 hover:border-base-300 transition-colors cursor-grab active:cursor-grabbing"
    >
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

function ReadOnlyDescription({ content }: { content: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline,
      Link.configure({ openOnClick: true }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "text-xs text-muted-foreground leading-tight line-clamp-2 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5",
      },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [, setTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write a description..." }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onTransaction: () => setTick((t) => t + 1),
    editorProps: {
      attributes: {
        class: "px-3 py-2 text-sm text-foreground outline-none [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
      },
    },
  });

  if (!editor) return null;

  const activeFormats = [
    editor.isActive("bold") && "bold",
    editor.isActive("italic") && "italic",
    editor.isActive("underline") && "underline",
  ].filter(Boolean) as string[];

  const handleLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex-1 flex flex-col rounded-lg border-[1.5px] border-base-300 bg-base-200 overflow-hidden focus-within:border-primary transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-base-300 bg-base-200/50" onMouseDown={(e) => e.preventDefault()}>
        <ToggleGroup type="multiple" size="sm" value={activeFormats} onValueChange={() => {}}>
          <ToggleGroupItem value="bold" aria-label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={TextBoldIcon} className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={TextItalicIcon} className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={TextUnderlineIcon} className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-4 bg-base-300 mx-1" />

        <ToggleGroup type="multiple" size="sm">
          <ToggleGroupItem value="link" aria-label="Insert link" onClick={handleLink} className="size-7 p-0 rounded-md data-[state=on]:bg-none">
            <HugeiconsIcon icon={Link02Icon} className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="ul" aria-label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={LeftToRightListBulletIcon} className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="ol" aria-label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={LeftToRightListNumberIcon} className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-4 bg-base-300 mx-px" />

        <button type="button" title="Image upload (coming soon)" className="size-7 p-0 rounded-md inline-flex items-center justify-center text-muted-foreground opacity-40 cursor-not-allowed" disabled>
          <HugeiconsIcon icon={Image01Icon} className="size-4" />
        </button>
      </div>

      <EditorContent editor={editor} className="flex-1 overflow-y-auto [&_.tiptap]:h-full" />
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
  const { data: members } = useWorkspaceMembers(workspaceId);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriorityEnum>(
    (task.priority as TaskPriorityEnum) || TaskPriorityEnum.NONE,
  );
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showAssigneeDropdown) return;
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setShowAssigneeDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAssigneeDropdown]);

  const filteredMembers = members?.filter((m) => {
    if (!assigneeSearch.trim()) return true;
    const q = assigneeSearch.toLowerCase();
    const u = m.user;
    if (!u) return false;
    return u.username.toLowerCase().includes(q) || u.firstname.toLowerCase().includes(q) || u.lastname.toLowerCase().includes(q);
  });

  const selectedMember = members?.find((m) => m.user_id === assigneeId);

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
          assignee_id: assigneeId,
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
        className="bg-base-100 rounded-xl p-6 max-w-3xl w-full mx-4 border border-base-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold">Edit Task Details</h2>
          <div className="flex items-center gap-2">
            <button title="Delete task" onClick={handleDelete} className="size-7 p-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-base-300 data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap">
              <HugeiconsIcon
                icon={Delete02Icon}
                className="size-4 text-muted-foreground hover:text-error transition-colors"
              />
            </button>
            <button title="Close" onClick={onClose} className="size-7 p-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-base-300 data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap">
              <HugeiconsIcon
                icon={Cancel01Icon}
                className="size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              />
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
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

            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-xs text-muted-foreground mb-2 block">
                Description
              </label>
              <RichTextEditor value={description} onChange={setDescription} />
            </div>
          </div>

          <div className="w-[280px] shrink-0 flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Priority
              </label>
              <div className="flex justify-center gap-1.5">
                {Object.values(TaskPriorityEnum).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "px-2.5 py-1.5 text-xs rounded-md border transition-colors cursor-pointer capitalize",
                      priority === p ? "border-primary bg-primary/10 text-primary" : "hover:bg-base-200 border-base-200 hover:border-muted-foreground text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">
                  Deadline
                </label>
                {deadline ? (
                  <button
                    type="button"
                    onClick={() => setDeadline(undefined)}
                    className="text-xs text-error hover:text-error/80 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeadline(new Date())}
                    className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    + Add deadline
                  </button>
                )}
              </div>
              {deadline ? (
                <DatePickerTime date={deadline} setDate={setDeadline} />
              ) : (
                <div className="flex items-center justify-center w-full h-9 text-xs text-muted-foreground border-[1.5px] border-dashed border-base-300 rounded-lg">No deadline</div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Assignee
              </label>
              <div className="relative" ref={assigneeRef}>
                <button
                  type="button"
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-base-200 rounded-lg border-[1.5px] border-base-300 shadow-md/5 transition-all text-left cursor-pointer"
                >
                  <HugeiconsIcon icon={UserIcon} className="size-4 text-muted-foreground shrink-0" />
                  <span className={selectedMember?.user ? "text-foreground" : "text-muted-foreground"}>
                    {selectedMember?.user
                      ? `${selectedMember.user.firstname} ${selectedMember.user.lastname}`
                      : "Unassigned"}
                  </span>
                  {assigneeId && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAssigneeId(null); }}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                    </button>
                  )}
                </button>

                {showAssigneeDropdown && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-base-100 border border-base-200 rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
                    <div className="p-1.5 border-b border-base-200">
                      <Input
                        type="text"
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search members..."
                        autoFocus
                      />
                    </div>
                    <div className="p-1">
                      {filteredMembers && filteredMembers.length > 0 ? (
                        filteredMembers.map((m) => (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => {
                              setAssigneeId(m.user_id);
                              setShowAssigneeDropdown(false);
                              setAssigneeSearch("");
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                              m.user_id === assigneeId ? "bg-primary/10 text-primary" : "hover:bg-base-200 text-foreground"
                            )}
                          >
                            <UserAvatar user={m.user} size={6} variant="ghost" />
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-medium leading-tight">
                                {m.user ? `${m.user.firstname} ${m.user.lastname}` : "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground leading-tight">
                                {m.user?.username}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="px-2 py-3 text-xs text-muted-foreground text-center">No members found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Labels
              </label>
              <div className={cn("flex flex-wrap gap-2", labels.length > 0 && "mb-2")}>
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
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-base-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-base-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save"}
          </button>
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
  return format(new Date(date), "MMM d");
}
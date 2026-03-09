"use client";

import { useReducer, useEffect, useRef, KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Delete02Icon, UserIcon } from "@hugeicons/core-free-icons";
import type { Task } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { useUpdateTask, useDeleteTask } from "@/hooks/use-boards";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { TaskPriorityEnum } from "../../lib/kanban.utils";
import { RichTextEditor } from "./RichTextEditor";

export interface TaskDetailModalProps {
  task: Task;
  workspaceId: string;
  boardId: string;
  onClose: () => void;
}

type TaskDetailState = {
  title: string;
  description: string;
  priority: TaskPriorityEnum;
  deadline: Date | undefined;
  assigneeId: string | null;
  showAssigneeDropdown: boolean;
  assigneeSearch: string;
  labels: string[];
  labelInput: string;
  saving: boolean;
};

function reducer(state: TaskDetailState, updates: Partial<TaskDetailState>): TaskDetailState {
  return { ...state, ...updates };
}

export function TaskDetailModal({ task, workspaceId, boardId, onClose }: TaskDetailModalProps) {
  const { data: members } = useWorkspaceMembers(workspaceId);
  const updateTask = useUpdateTask(workspaceId, boardId);
  const deleteTask = useDeleteTask(workspaceId, boardId);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const assigneeRef = useRef<HTMLDivElement>(null);

  const [state, dispatch] = useReducer(reducer, {
    title: task.title,
    description: task.description || "",
    priority: (task.priority as TaskPriorityEnum) || TaskPriorityEnum.NONE,
    deadline: task.due_date ? new Date(task.due_date) : undefined,
    assigneeId: task.assignee_id,
    showAssigneeDropdown: false,
    assigneeSearch: "",
    labels: task.labels || [],
    labelInput: "",
    saving: false,
  });

  useEffect(() => {
    if (!state.showAssigneeDropdown) return;
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        dispatch({ showAssigneeDropdown: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [state.showAssigneeDropdown]);

  const filteredMembers = members?.filter((m) => {
    if (!state.assigneeSearch.trim()) return true;
    const q = state.assigneeSearch.toLowerCase();
    const u = m.user;
    if (!u) return false;
    return u.username.toLowerCase().includes(q) || u.firstname.toLowerCase().includes(q) || u.lastname.toLowerCase().includes(q);
  });

  const selectedMember = members?.find((m) => m.user_id === state.assigneeId);

  const handleSave = async () => {
    dispatch({ saving: true });

    await updateTask
      .mutateAsync({
        taskId: task.id,
        data: {
          title: state.title.trim() || task.title,
          description: state.description.trim() || undefined,
          priority: state.priority,
          due_date: state.deadline ? new Date(state.deadline).toISOString() : null,
          labels: state.labels,
          assignee_id: state.assigneeId,
        },
      })
      .finally(() => {
        dispatch({ saving: false });
        onClose();
      });
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-background/50 p-4 sm:p-0"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter") onClose();
      }}
      role="presentation"
    >
      <div
        className={cn(
          "bg-base-100 rounded-xl p-6 shadow-xl border border-base-200 w-full mx-auto overflow-y-auto max-h-[90vh]",
          isMobile ? "max-w-full" : "max-w-3xl"
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold">Edit Task Details</h2>
            <p className="text-xs text-muted-foreground leading-tight">Change the details of this task</p>
          </div>
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

        <div className={cn("flex gap-6", isMobile ? "flex-col" : "flex-row")}>
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <label htmlFor="task-title" className="text-xs text-muted-foreground mb-2 block">
                Title
              </label>
              <Input
                type="text"
                id="task-title"
                value={state.title}
                onChange={(e) => dispatch({ title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <label htmlFor="task-description" className="text-xs text-muted-foreground mb-2 block">
                Description
              </label>
              <RichTextEditor value={state.description} onChange={(val) => dispatch({ description: val })} />
            </div>
          </div>

          <div className={cn("shrink-0 flex flex-col gap-4", isMobile ? "w-full" : "w-[280px]")}>
            <div>
              <label htmlFor="task-priority" className="text-xs text-muted-foreground mb-2 block">
                Priority
              </label>
              <div className="flex justify-center gap-1.5">
                {Object.values(TaskPriorityEnum).map((p) => (
                  <button
                    key={p}
                    onClick={() => dispatch({ priority: p })}
                    className={cn(
                      "px-2.5 py-1.5 text-xs rounded-md border transition-colors cursor-pointer capitalize",
                      state.priority === p ? "border-primary bg-primary/10 text-primary" : "hover:bg-base-200 border-base-200 hover:border-muted-foreground text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="task-deadline" className="text-xs text-muted-foreground">
                  Deadline
                </label>
                {state.deadline ? (
                  <button
                    type="button"
                    onClick={() => dispatch({ deadline: undefined })}
                    className="text-xs text-error hover:text-error/80 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => dispatch({ deadline: new Date() })}
                    className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    + Add deadline
                  </button>
                )}
              </div>
              {state.deadline ? (
                <DatePicker date={state.deadline} setDate={(date) => dispatch({ deadline: date })} />
              ) : (
                <div className="flex items-center justify-center w-full h-9 text-xs text-muted-foreground border-[1.5px] border-dashed border-base-300 rounded-lg">No deadline</div>
              )}
            </div>

            <div>
              <label htmlFor="task-assignee" className="text-xs text-muted-foreground mb-2 block">
                Assignee
              </label>
              <div className="relative" ref={assigneeRef}>
                <button
                  type="button"
                  onClick={() => dispatch({ showAssigneeDropdown: !state.showAssigneeDropdown })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-base-200 rounded-lg border-[1.5px] border-base-300 shadow-md/5 transition-all text-left cursor-pointer"
                >
                  <HugeiconsIcon icon={UserIcon} className="size-4 text-muted-foreground shrink-0" />
                  <span className={selectedMember?.user ? "text-foreground" : "text-muted-foreground"}>
                    {selectedMember?.user
                      ? `${selectedMember.user.firstname} ${selectedMember.user.lastname}`
                      : "Unassigned"}
                  </span>
                  {state.assigneeId && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dispatch({ assigneeId: null }); }}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                    </button>
                  )}
                </button>

                {state.showAssigneeDropdown && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-base-100 border border-base-200 rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
                    <div className="p-1.5 border-b border-base-200">
                      <Input
                        type="text"
                        value={state.assigneeSearch}
                        onChange={(e) => dispatch({ assigneeSearch: e.target.value })}
                        placeholder="Search members..."
                        ref={(input) => {
                          if (input) input.focus();
                        }}
                      />
                    </div>
                    <div className="p-1">
                      {filteredMembers && filteredMembers.length > 0 ? (
                        filteredMembers.map((m) => (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => {
                              dispatch({
                                assigneeId: m.user_id,
                                showAssigneeDropdown: false,
                                assigneeSearch: ""
                              });
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                              m.user_id === state.assigneeId ? "bg-primary/10 text-primary" : "hover:bg-base-200 text-foreground"
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
              <label htmlFor="task-labels" className="text-xs text-muted-foreground mb-2 block">
                Labels
              </label>
              <div className={cn("flex flex-wrap gap-2", state.labels.length > 0 && "mb-2")}>
                {state.labels.map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-base-200 rounded-md text-foreground"
                  >
                    {label}
                    <button
                      onClick={() => dispatch({ labels: state.labels.filter((l) => l !== label) })}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                type="text"
                value={state.labelInput}
                onChange={(e) => dispatch({ labelInput: e.target.value })}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && state.labelInput.trim()) {
                    e.preventDefault();
                    if (!state.labels.includes(state.labelInput.trim())) {
                      dispatch({
                        labels: [...state.labels, state.labelInput.trim()],
                        labelInput: ""
                      });
                    } else {
                      dispatch({ labelInput: "" });
                    }
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
            disabled={state.saving}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {state.saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

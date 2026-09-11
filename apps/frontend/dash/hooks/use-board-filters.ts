"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Board, BoardColumn, Task } from "@crwsync/types";
import { TaskPriorityEnum } from "@crwsync/types";

export type BoardViewMode = "kanban" | "list";
export type DueDateFilter = "overdue" | "today" | "week" | "later" | "none";
export type BoardFilterListKey = "assignee" | "priority" | "label";

export interface BoardFilters {
  assignees: string[];
  priorities: TaskPriorityEnum[];
  labels: string[];
  due: DueDateFilter | null;
}

function parseListParam(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function taskMatchesDue(task: Task, due: DueDateFilter): boolean {
  if (!task.due_date) return due === "none";
  if (due === "none") return false;

  const today = new Date().setHours(0, 0, 0, 0);
  const deadline = new Date(task.due_date).setHours(0, 0, 0, 0);
  const diff = deadline - today;
  const DAY = 24 * 60 * 60 * 1000;

  if (due === "overdue") return diff < 0;
  if (due === "today") return diff >= 0 && diff < DAY;
  if (due === "week") return diff >= DAY && diff < 7 * DAY;
  return diff >= 7 * DAY; // later
}

export function useBoardFilters(board: Board | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: BoardFilters = useMemo(() => ({
    assignees: parseListParam(searchParams.get("assignee")),
    priorities: parseListParam(searchParams.get("priority")) as TaskPriorityEnum[],
    labels: parseListParam(searchParams.get("label")),
    due: (searchParams.get("due") as DueDateFilter | null) || null,
  }), [searchParams]);

  const view: BoardViewMode = searchParams.get("view") === "list" ? "list" : "kanban";

  const pushParams = useCallback((params: URLSearchParams) => {
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname]);

  const toggleListParam = useCallback((key: BoardFilterListKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = parseListParam(params.get(key));
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    if (next.length) params.set(key, next.join(",")); else params.delete(key);
    pushParams(params);
  }, [searchParams, pushParams]);

  const setDue = useCallback((value: DueDateFilter | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("due", value); else params.delete("due");
    pushParams(params);
  }, [searchParams, pushParams]);

  const setView = useCallback((value: BoardViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "list") params.set("view", "list"); else params.delete("view");
    pushParams(params);
  }, [searchParams, pushParams]);

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    (["assignee", "priority", "label", "due"] as const).forEach((k) => params.delete(k));
    pushParams(params);
  }, [searchParams, pushParams]);

  const activeFilterCount =
    filters.assignees.length + filters.priorities.length + filters.labels.length + (filters.due ? 1 : 0);

  const availableAssigneeIds = useMemo(() => {
    const ids = new Set<string>();
    board?.columns?.forEach((col) => col.tasks?.forEach((t) => t.assignee_id && ids.add(t.assignee_id)));
    return ids;
  }, [board]);

  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    board?.columns?.forEach((col) => col.tasks?.forEach((t) => t.labels?.forEach((l) => labels.add(l))));
    return Array.from(labels).sort();
  }, [board]);

  const taskMatches = useCallback((task: Task): boolean => {
    if (filters.assignees.length && (!task.assignee_id || !filters.assignees.includes(task.assignee_id))) return false;
    if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
    if (filters.labels.length && !task.labels?.some((l) => filters.labels.includes(l))) return false;
    if (filters.due && !taskMatchesDue(task, filters.due)) return false;
    return true;
  }, [filters]);

  const filteredColumns: BoardColumn[] = useMemo(() => {
    if (!board?.columns) return [];
    if (!activeFilterCount) return board.columns;
    return board.columns.map((col) => ({ ...col, tasks: col.tasks?.filter(taskMatches) }));
  }, [board, activeFilterCount, taskMatches]);

  return {
    filters,
    view,
    setView,
    toggleListParam,
    setDue,
    clearFilters,
    activeFilterCount,
    availableAssigneeIds,
    availableLabels,
    filteredColumns,
  };
}

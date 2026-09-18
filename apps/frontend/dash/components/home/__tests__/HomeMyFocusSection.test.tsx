import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useState } from "react";
import { HomeMyFocusSection } from "../HomeMyFocusSection";
import { ScheduleTaskRow } from "@/components/schedules/ScheduleTaskRow";
import { TaskPriorityEnum } from "@crwsync/types";
import type { HomeTaskItem } from "@crwsync/types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: vi.fn(actual.useState) };
});

function findByTestId(node: unknown, testId: string): { props: Record<string, unknown> } | null {
  if (node === null || node === undefined || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByTestId(child, testId);
      if (found) return found;
    }
    return null;
  }
  const element = node as { props?: Record<string, unknown> };
  if (element.props?.["data-testid"] === testId) return element as { props: Record<string, unknown> };
  return findByTestId(element.props?.children, testId);
}

function collectByType(
  node: unknown,
  type: unknown,
  results: { props: Record<string, unknown> }[] = []
): { props: Record<string, unknown> }[] {
  if (node === null || node === undefined || typeof node !== "object") return results;
  if (Array.isArray(node)) {
    for (const child of node) collectByType(child, type, results);
    return results;
  }
  const element = node as { type?: unknown; props?: Record<string, unknown> };
  if (element.type === type) results.push(element as { props: Record<string, unknown> });
  collectByType(element.props?.children, type, results);
  return results;
}

function makeTask(overrides: Partial<HomeTaskItem>): HomeTaskItem {
  return {
    id: "task-1",
    shortId: "TSK-001",
    title: "Ship the release notes",
    priority: TaskPriorityEnum.HIGH,
    status: "IN_PROGRESS",
    columnId: "col-1",
    boardId: "board-1",
    boardTitle: "Launch Board",
    dueDate: null,
    commentsCount: 0,
    attachmentsCount: 0,
    checklistTotal: 0,
    checklistCompleted: 0,
    ...overrides,
  };
}

describe("HomeMyFocusSection", () => {
  it("renders the section title and tab headers with correct task counts", () => {
    vi.mocked(useState).mockReturnValueOnce(["overdue", vi.fn()]);
    const focus = {
      overdue: [makeTask({ id: "od-1" })],
      dueToday: [makeTask({ id: "dt-1" }), makeTask({ id: "dt-2" })],
      inProgress: [makeTask({ id: "ip-1" }), makeTask({ id: "ip-2" }), makeTask({ id: "ip-3" })],
    };
    const tree = HomeMyFocusSection({ focus, slug: "my-workspace" });
    expect(findByTestId(tree, "home-focus-tab-count-overdue")?.props.children).toBe(1);
    expect(findByTestId(tree, "home-focus-tab-count-dueToday")?.props.children).toBe(2);
    expect(findByTestId(tree, "home-focus-tab-count-inProgress")?.props.children).toBe(3);
  });

  it("defaults to the overdue tab when overdue tasks exist", () => {
    const focus = {
      overdue: [makeTask({ id: "od-1", title: "Overdue task" })],
      dueToday: [makeTask({ id: "dt-1", title: "Due today task" })],
      inProgress: [makeTask({ id: "ip-1", title: "In progress task" })],
    };
    const html = renderToStaticMarkup(<HomeMyFocusSection focus={focus} slug="my-workspace" />);
    expect(html).toContain("Overdue task");
    expect(html).not.toContain("Due today task");
    expect(html).not.toContain("In progress task");
  });

  it("defaults to the dueToday tab when there is no overdue task", () => {
    const focus = {
      overdue: [],
      dueToday: [makeTask({ id: "dt-1", title: "Due today task" })],
      inProgress: [makeTask({ id: "ip-1", title: "In progress task" })],
    };
    const html = renderToStaticMarkup(<HomeMyFocusSection focus={focus} slug="my-workspace" />);
    expect(html).toContain("Due today task");
    expect(html).not.toContain("In progress task");
  });

  it("defaults to the inProgress tab when nothing is overdue or due today", () => {
    const focus = {
      overdue: [],
      dueToday: [],
      inProgress: [makeTask({ id: "ip-1", title: "In progress task" })],
    };
    const html = renderToStaticMarkup(<HomeMyFocusSection focus={focus} slug="my-workspace" />);
    expect(html).toContain("In progress task");
  });

  it("renders tasks for the selected tab and passes callbacks through to ScheduleTaskRow", () => {
    vi.mocked(useState).mockReturnValueOnce(["dueToday", vi.fn()]);
    const onSelectTask = vi.fn();
    const onToggleComplete = vi.fn();
    const onReschedule = vi.fn();
    const focus = {
      overdue: [makeTask({ id: "od-1" })],
      dueToday: [makeTask({ id: "dt-1" }), makeTask({ id: "dt-2" })],
      inProgress: [makeTask({ id: "ip-1" })],
    };
    const tree = HomeMyFocusSection({
      focus,
      slug: "my-workspace",
      onSelectTask,
      onToggleComplete,
      onReschedule,
    });
    const rows = collectByType(tree, ScheduleTaskRow);
    expect(rows.map((row) => (row.props.task as HomeTaskItem).id)).toEqual(["dt-1", "dt-2"]);
    for (const row of rows) {
      expect(row.props.onTaskClick).toBe(onSelectTask);
      expect(row.props.onToggleComplete).toBe(onToggleComplete);
      expect(row.props.onReschedule).toBe(onReschedule);
    }
  });

  it("renders the empty state for a tab with no tasks", () => {
    vi.mocked(useState).mockReturnValueOnce(["inProgress", vi.fn()]);
    const focus = { overdue: [], dueToday: [], inProgress: [] };
    const tree = HomeMyFocusSection({ focus, slug: "my-workspace" });
    const emptyState = findByTestId(tree, "home-focus-empty-state");
    expect(emptyState).not.toBeNull();
  });

  it("shows the overdue-specific empty state copy when the overdue tab is empty", () => {
    const html = renderToStaticMarkup(
      <HomeMyFocusSection focus={{ overdue: [], dueToday: [], inProgress: [] }} slug="my-workspace" />
    );
    expect(html).toContain("All clear");
  });

  it("switches to the clicked tab", () => {
    const setActiveTab = vi.fn();
    vi.mocked(useState).mockReturnValueOnce(["inProgress", setActiveTab]);
    const focus = {
      overdue: [makeTask({ id: "od-1" })],
      dueToday: [makeTask({ id: "dt-1" })],
      inProgress: [],
    };
    const tree = HomeMyFocusSection({ focus, slug: "my-workspace" });

    (findByTestId(tree, "home-focus-tab-overdue")?.props.onClick as () => void)();
    expect(setActiveTab).toHaveBeenCalledWith("overdue");

    (findByTestId(tree, "home-focus-tab-dueToday")?.props.onClick as () => void)();
    expect(setActiveTab).toHaveBeenCalledWith("dueToday");

    (findByTestId(tree, "home-focus-tab-inProgress")?.props.onClick as () => void)();
    expect(setActiveTab).toHaveBeenCalledWith("inProgress");
  });
});

import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeTaskRow } from "../HomeTaskRow";
import { QuickRescheduleMenu } from "@/components/schedules/QuickRescheduleMenu";
import { TaskPriorityEnum } from "@crwsync/types";
import type { HomeTaskItem } from "@crwsync/types";

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

function findByType(node: unknown, type: unknown): { props: Record<string, unknown> } | null {
  if (node === null || node === undefined || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as { type?: unknown; props?: Record<string, unknown> };
  if (element.type === type) return element as { props: Record<string, unknown> };
  return findByType(element.props?.children, type);
}

const baseTask: HomeTaskItem = {
  id: "task-1",
  title: "Ship the release notes",
  priority: TaskPriorityEnum.HIGH,
  status: "IN_PROGRESS",
  columnId: "col-1",
  boardId: "board-1",
  boardTitle: "Launch Board",
  projectId: "proj-1",
  projectName: "Q3 Launch",
  dueDate: "2026-09-20T00:00:00.000Z",
  commentsCount: 4,
  attachmentsCount: 2,
  checklistTotal: 5,
  checklistCompleted: 3,
};

describe("HomeTaskRow", () => {
  it("renders task title, priority, board breadcrumb, checklist counters, and comments", () => {
    const html = renderToStaticMarkup(<HomeTaskRow task={baseTask} slug="my-workspace" />);
    expect(html).toContain("Ship the release notes");
    expect(html).toContain("High");
    expect(html).toContain("Q3 Launch / Launch Board");
    expect(html).toContain("3/5");
    expect(html).toContain("4");
    expect(html).toContain("2");
  });

  it("falls back to board title only when there is no project", () => {
    const html = renderToStaticMarkup(
      <HomeTaskRow task={{ ...baseTask, projectName: undefined }} slug="my-workspace" />
    );
    expect(html).toContain(">Launch Board<");
  });

  it("invokes onToggleComplete(task) when clicking the completion button", () => {
    const onToggleComplete = vi.fn();
    const tree = HomeTaskRow({ task: baseTask, slug: "my-workspace", onToggleComplete });
    const toggle = findByTestId(tree, "home-task-toggle");
    (toggle?.props.onClick as (e: { stopPropagation: () => void }) => void)({
      stopPropagation: vi.fn(),
    });
    expect(onToggleComplete).toHaveBeenCalledWith(baseTask);
  });

  it("invokes onSelectTask(task) when clicking the row", () => {
    const onSelectTask = vi.fn();
    const tree = HomeTaskRow({ task: baseTask, slug: "my-workspace", onSelectTask });
    const row = findByTestId(tree, "home-task-row");
    (row?.props.onClick as () => void)();
    expect(onSelectTask).toHaveBeenCalledWith(baseTask);
  });

  it("invokes onSelectTask(task) on Enter and Space key presses", () => {
    const onSelectTask = vi.fn();
    const tree = HomeTaskRow({ task: baseTask, slug: "my-workspace", onSelectTask });
    const row = findByTestId(tree, "home-task-row");
    const onKeyDown = row?.props.onKeyDown as (e: { key: string; preventDefault: () => void }) => void;
    onKeyDown({ key: "Enter", preventDefault: vi.fn() });
    onKeyDown({ key: " ", preventDefault: vi.fn() });
    expect(onSelectTask).toHaveBeenCalledTimes(2);
  });

  it("triggers onReschedule(task, date) via the reschedule menu", () => {
    const onReschedule = vi.fn();
    const tree = HomeTaskRow({ task: baseTask, slug: "my-workspace", onReschedule });
    const menu = findByType(tree, QuickRescheduleMenu);
    (menu?.props.onReschedule as (date: string | null) => void)("2026-09-25T00:00:00.000Z");
    expect(onReschedule).toHaveBeenCalledWith(baseTask, "2026-09-25T00:00:00.000Z");
  });
});

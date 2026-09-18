import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScheduleTaskRow } from "../ScheduleTaskRow";
import { TaskPriorityEnum } from "@crwsync/types";
import type { ScheduleTask, HomeTaskItem, ColumnType } from "@crwsync/types";

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

const baseScheduleTask: ScheduleTask = {
  id: "task-1",
  shortId: "TSK-001",
  title: "Implement schedule view",
  description: null,
  priority: TaskPriorityEnum.HIGH,
  position: 1,
  column_id: "col-1",
  due_date: "2026-10-15T00:00:00.000Z",
  completed_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  column: {
    id: "col-1",
    name: "In Progress",
    type: "ONGOING" as ColumnType,
    color: "#3b82f6",
    board_id: "board-1",
  },
  board: {
    id: "board-1",
    name: "Sprint 42",
  },
  assignee: {
    id: "user-1",
    firstname: "Sarah",
    lastname: "Connor",
    username: "sconnor",
    avatar_key: null,
  } as unknown as ScheduleTask["assignee"],
} as unknown as ScheduleTask;

const baseHomeTask: HomeTaskItem = {
  id: "home-task-1",
  shortId: "NL-11",
  title: "Review pull requests",
  priority: TaskPriorityEnum.URGENT,
  status: "In Review",
  columnId: "col-2",
  boardId: "board-2",
  boardTitle: "Platform Core",
  projectId: "proj-1",
  projectName: "Infrastructure",
  dueDate: "2026-10-20T00:00:00.000Z",
  commentsCount: 3,
  attachmentsCount: 1,
  checklistTotal: 4,
  checklistCompleted: 2,
};

describe("ScheduleTaskRow", () => {
  it("renders a ScheduleTask with title, shortId, board, column, and priority", () => {
    const html = renderToStaticMarkup(<ScheduleTaskRow task={baseScheduleTask} />);
    expect(html).toContain("Implement schedule view");
    expect(html).toContain("TSK-001");
    expect(html).toContain("Sprint 42");
    expect(html).toContain("In Progress");
  });

  it("renders a HomeTaskItem with shortId, project, and board title", () => {
    const html = renderToStaticMarkup(<ScheduleTaskRow task={{ ...baseHomeTask, columnColor: "#10b981" }} />);
    expect(html).toContain("Review pull requests");
    expect(html).toContain("NL-11");
    expect(html).toContain("Infrastructure / Platform Core");
    expect(html).toContain("In Review");
    expect(html).toContain("#10b981");
    expect(html).toContain("2/4");
    expect(html).toContain("3");
    expect(html).toContain("1");
  });

  it("renders ScheduleTask checklist count from _count if available", () => {
    const taskWithCount: ScheduleTask = {
      ...baseScheduleTask,
      _count: {
        comments: 5,
        checklistItems: 3,
      },
    };
    const html = renderToStaticMarkup(<ScheduleTaskRow task={taskWithCount} />);
    expect(html).toContain("3");
    expect(html).toContain("5");
  });

  it("invokes onTaskClick when row or title is clicked", () => {
    const onTaskClick = vi.fn();
    const tree = ScheduleTaskRow({ task: baseScheduleTask, onTaskClick });
    const row = findByTestId(tree, "schedule-task-row");
    (row?.props.onClick as () => void)();
    expect(onTaskClick).toHaveBeenCalledWith(baseScheduleTask);
  });

  it("invokes onTaskClick on Enter and Space key presses", () => {
    const onTaskClick = vi.fn();
    const tree = ScheduleTaskRow({ task: baseScheduleTask, onTaskClick });
    const row = findByTestId(tree, "schedule-task-row");
    const onKeyDown = row?.props.onKeyDown as (e: { key: string; preventDefault: () => void }) => void;
    onKeyDown({ key: "Enter", preventDefault: vi.fn() });
    onKeyDown({ key: " ", preventDefault: vi.fn() });
    expect(onTaskClick).toHaveBeenCalledTimes(2);
  });

  it("invokes onToggleComplete when checkbox is clicked", () => {
    const onToggleComplete = vi.fn();
    const tree = ScheduleTaskRow({ task: baseHomeTask, onToggleComplete });
    const checkbox = findByTestId(tree, "task-complete-checkbox");
    (checkbox?.props.onCheckedChange as (checked: boolean) => void)(true);
    expect(onToggleComplete).toHaveBeenCalledWith(baseHomeTask, true);
  });
});

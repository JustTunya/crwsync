import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState, useCallback, useEffect } from "react";
import { HomeDashboard } from "../home-dashboard";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { HomeHeader, type HomeHeaderProps } from "@/components/home/HomeHeader";
import { HomeMyFocusSection, type HomeMyFocusSectionProps } from "@/components/home/HomeMyFocusSection";
import {
  HomeActiveProjectsSection,
  type HomeActiveProjectsSectionProps,
} from "@/components/home/HomeActiveProjectsSection";
import {
  HomePinnedModulesSection,
  type HomePinnedModulesSectionProps,
} from "@/components/home/HomePinnedModulesSection";
import {
  HomeActivityStreamSection,
  type HomeActivityStreamSectionProps,
} from "@/components/home/HomeActivityStreamSection";
import { HomeVelocityCard, type HomeVelocityCardProps } from "@/components/home/HomeVelocityCard";
import { useWorkspace } from "@/providers/workspace.provider";
import { useSocket } from "@/providers/socket.provider";
import { useWorkspaceHome, homeKeys } from "@/hooks/use-workspace-home";
import * as boardService from "@/services/board.service";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { TaskPriorityEnum, WorkspaceRoleEnum, ModuleTypeEnum } from "@crwsync/types";
import type { WorkspaceHomeData, WorkspaceHomeSummary, HomeTaskItem } from "@crwsync/types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: vi.fn(),
    useCallback: vi.fn(),
    useEffect: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("@/providers/workspace.provider", () => ({
  useWorkspace: vi.fn(),
}));

vi.mock("@/providers/socket.provider", () => ({
  useSocket: vi.fn(),
}));

vi.mock("@/hooks/use-workspace-home", () => ({
  useWorkspaceHome: vi.fn(),
  homeKeys: {
    all: ["home"],
    detail: (workspaceId: string) => ["home", "detail", workspaceId],
  },
}));

vi.mock("@/services/board.service", () => ({
  updateTask: vi.fn(),
}));

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

function makeSummary(overrides: Partial<WorkspaceHomeSummary> = {}): WorkspaceHomeSummary {
  return {
    greeting: "Good morning, Alex",
    todayFormatted: "Monday, September 14",
    urgentCount: 2,
    activeTasksCount: 5,
    completionVelocity: 12,
    workspaceMembersCount: 4,
    ...overrides,
  };
}

function makeTask(overrides: Partial<HomeTaskItem> = {}): HomeTaskItem {
  return {
    id: "task-1",
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

function makeHomeData(overrides: Partial<WorkspaceHomeData> = {}): WorkspaceHomeData {
  return {
    summary: makeSummary(),
    myFocus: {
      overdue: [makeTask({ id: "od-1" })],
      dueToday: [],
      inProgress: [makeTask({ id: "ip-1" })],
    },
    projects: [
      {
        id: "proj-1",
        title: "Launch",
        color: "#f97316",
        boardId: "board-1",
        totalTasks: 10,
        completedTasks: 4,
        progressPercentage: 40,
        members: [{ id: "u-1", name: "Alex" }],
      },
    ],
    pinnedModules: [
      { id: "mod-1", name: "Launch Board", type: ModuleTypeEnum.BOARD, isPinned: true, badgeCount: 3 },
    ],
    recentActivity: [
      {
        id: "act-1",
        type: "task_created",
        message: "created",
        actor: { id: "u-1", name: "Alex" },
        target: { id: "task-1", title: "Ship the release notes", href: "/board/board-1" },
        createdAt: new Date().toISOString(),
      },
    ],
    crew: [{ id: "u-1", name: "Alex", role: WorkspaceRoleEnum.OWNER, isOnline: true }],
    ...overrides,
  };
}

const SOCKET_EVENTS = [
  "board:task:created",
  "board:task:updated",
  "board:task:moved",
  "board:task:deleted",
  "status:update",
];

let setActiveTaskSpy: ReturnType<typeof vi.fn>;
let pushSpy: ReturnType<typeof vi.fn>;
let invalidateQueriesSpy: ReturnType<typeof vi.fn>;
let refetchSpy: ReturnType<typeof vi.fn>;
let socketOn: ReturnType<typeof vi.fn>;
let socketOff: ReturnType<typeof vi.fn>;
let effectCleanups: Array<() => void>;

function renderDashboard(slug = "acme") {
  return HomeDashboard({ slug });
}

beforeEach(() => {
  setActiveTaskSpy = vi.fn();
  pushSpy = vi.fn();
  invalidateQueriesSpy = vi.fn();
  refetchSpy = vi.fn();
  socketOn = vi.fn();
  socketOff = vi.fn();
  effectCleanups = [];

  vi.mocked(useState).mockImplementation(((initial?: unknown) => [
    typeof initial === "function" ? (initial as () => unknown)() : initial,
    setActiveTaskSpy,
  ]) as unknown as typeof useState);
  vi.mocked(useCallback).mockImplementation(((fn: unknown) => fn) as unknown as typeof useCallback);
  vi.mocked(useEffect).mockImplementation(((effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (typeof cleanup === "function") effectCleanups.push(cleanup);
  }) as unknown as typeof useEffect);

  vi.mocked(useRouter).mockReturnValue({ push: pushSpy } as unknown as ReturnType<typeof useRouter>);
  vi.mocked(useQueryClient).mockReturnValue({
    invalidateQueries: invalidateQueriesSpy,
  } as unknown as ReturnType<typeof useQueryClient>);
  vi.mocked(useWorkspace).mockReturnValue({ activeId: "ws-1" } as unknown as ReturnType<typeof useWorkspace>);
  vi.mocked(useSocket).mockReturnValue({
    socket: { on: socketOn, off: socketOff },
    isConnected: true,
  } as unknown as ReturnType<typeof useSocket>);
  vi.mocked(useWorkspaceHome).mockReturnValue({
    data: makeHomeData(),
    isLoading: false,
    isFetching: false,
    refetch: refetchSpy,
  } as unknown as ReturnType<typeof useWorkspaceHome>);
  vi.mocked(boardService.updateTask).mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomeDashboard", () => {
  it("renders HomeSkeleton while the home data is loading", () => {
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    const tree = renderDashboard();
    expect(tree.type).toBe(HomeSkeleton);
  });

  it("renders HomeSkeleton when the workspace id has not resolved yet", () => {
    vi.mocked(useWorkspace).mockReturnValue({ activeId: undefined } as unknown as ReturnType<typeof useWorkspace>);
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    const tree = renderDashboard();
    expect(tree.type).toBe(HomeSkeleton);
  });

  it("renders the full Bento command center layout and wires resolved data into every section", () => {
    const data = makeHomeData();
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data,
      isLoading: false,
      isFetching: true,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    const tree = renderDashboard("acme");

    const [header] = collectByType(tree, HomeHeader);
    const headerProps = header.props as unknown as HomeHeaderProps;
    expect(headerProps.summary).toBe(data.summary);

    const [focus] = collectByType(tree, HomeMyFocusSection);
    const focusProps = focus.props as unknown as HomeMyFocusSectionProps;
    expect(focusProps.focus).toBe(data.myFocus);
    expect(focusProps.slug).toBe("acme");
    expect(focusProps.onSelectTask).toBe(setActiveTaskSpy);

    const [projects] = collectByType(tree, HomeActiveProjectsSection);
    const projectsProps = projects.props as unknown as HomeActiveProjectsSectionProps;
    expect(projectsProps.projects).toBe(data.projects);
    expect(projectsProps.slug).toBe("acme");

    const [pinned] = collectByType(tree, HomePinnedModulesSection);
    const pinnedProps = pinned.props as unknown as HomePinnedModulesSectionProps;
    expect(pinnedProps.modules).toBe(data.pinnedModules);
    expect(pinnedProps.slug).toBe("acme");

    const [activityStream] = collectByType(tree, HomeActivityStreamSection);
    const activityProps = activityStream.props as unknown as HomeActivityStreamSectionProps;
    expect(activityProps.activity).toBe(data.recentActivity);

    const [velocity] = collectByType(tree, HomeVelocityCard);
    const velocityProps = velocity.props as unknown as HomeVelocityCardProps;
    expect(velocityProps.summary).toBe(data.summary);
  });

  it("handles empty and zero-value data without throwing", () => {
    const data = makeHomeData({
      summary: makeSummary({ urgentCount: 0, activeTasksCount: 0, completionVelocity: 0, workspaceMembersCount: 0 }),
      myFocus: { overdue: [], dueToday: [], inProgress: [] },
      projects: [],
      pinnedModules: [],
      recentActivity: [],
    });
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data,
      isLoading: false,
      isFetching: false,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    expect(() => renderDashboard()).not.toThrow();

    const tree = renderDashboard();
    const [projects] = collectByType(tree, HomeActiveProjectsSection);
    expect((projects.props as unknown as HomeActiveProjectsSectionProps).projects).toEqual([]);
    const [pinned] = collectByType(tree, HomePinnedModulesSection);
    expect((pinned.props as unknown as HomePinnedModulesSectionProps).modules).toEqual([]);
    const [activity] = collectByType(tree, HomeActivityStreamSection);
    expect((activity.props as unknown as HomeActivityStreamSectionProps).activity).toEqual([]);
  });

  it("attaches realtime listeners for every board and status event on mount", () => {
    renderDashboard();

    expect(socketOn).toHaveBeenCalledTimes(SOCKET_EVENTS.length);
    expect(socketOn.mock.calls.map((call) => call[0])).toEqual(SOCKET_EVENTS);
    const handlers = socketOn.mock.calls.map((call) => call[1]);
    expect(new Set(handlers).size).toBe(1);
  });

  it("invalidates the home query cache when a realtime event fires", () => {
    renderDashboard();
    const handler = socketOn.mock.calls[0][1] as () => void;
    handler();
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: homeKeys.all });
  });

  it("cleans up every socket listener on unmount", () => {
    renderDashboard();
    expect(effectCleanups).toHaveLength(1);

    effectCleanups[0]();

    expect(socketOff).toHaveBeenCalledTimes(SOCKET_EVENTS.length);
    expect(socketOff.mock.calls.map((call) => call[0])).toEqual(SOCKET_EVENTS);
  });

  it("does not attach or clean up listeners when no socket is connected", () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: null,
      isConnected: false,
    } as unknown as ReturnType<typeof useSocket>);

    renderDashboard();

    expect(socketOn).not.toHaveBeenCalled();
    expect(effectCleanups).toHaveLength(0);
  });

  it("updates the task and invalidates the cache when a task is marked complete", async () => {
    const tree = renderDashboard();
    const [focus] = collectByType(tree, HomeMyFocusSection);
    const { onToggleComplete } = focus.props as unknown as HomeMyFocusSectionProps;

    await onToggleComplete?.(makeTask({ id: "task-9", boardId: "board-9" }));

    expect(boardService.updateTask).toHaveBeenCalledWith("ws-1", "board-9", "task-9", {
      completed_at: expect.any(String),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: homeKeys.all });
  });

  it("does not call updateTask when the task has no boardId", async () => {
    const tree = renderDashboard();
    const [focus] = collectByType(tree, HomeMyFocusSection);
    const { onToggleComplete } = focus.props as unknown as HomeMyFocusSectionProps;

    await onToggleComplete?.(makeTask({ boardId: "" }));

    expect(boardService.updateTask).not.toHaveBeenCalled();
  });

  it("reschedules a task and invalidates the cache", async () => {
    const tree = renderDashboard();
    const [focus] = collectByType(tree, HomeMyFocusSection);
    const { onReschedule } = focus.props as unknown as HomeMyFocusSectionProps;

    await onReschedule?.(makeTask({ id: "task-3", boardId: "board-3" }), "2026-10-01");

    expect(boardService.updateTask).toHaveBeenCalledWith("ws-1", "board-3", "task-3", {
      due_date: "2026-10-01",
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: homeKeys.all });
  });

  it("navigates to the first project's board when creating a new task", () => {
    const data = makeHomeData();
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data,
      isLoading: false,
      isFetching: false,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    const tree = renderDashboard("acme");
    const [focus] = collectByType(tree, HomeMyFocusSection);
    (focus.props as unknown as HomeMyFocusSectionProps).onNewTask?.();

    expect(pushSpy).toHaveBeenCalledWith(`/acme/board/${data.projects[0].boardId}`);
  });

  it("falls back to the first in-progress focus task's board when there are no projects", () => {
    const data = makeHomeData({
      projects: [],
      myFocus: { overdue: [], dueToday: [], inProgress: [makeTask({ id: "ip-9", boardId: "board-77" })] },
    });
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data,
      isLoading: false,
      isFetching: false,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    const tree = renderDashboard("acme");
    const [focus] = collectByType(tree, HomeMyFocusSection);
    (focus.props as unknown as HomeMyFocusSectionProps).onNewTask?.();

    expect(pushSpy).toHaveBeenCalledWith("/acme/board/board-77");
  });

  it("does nothing when creating a new task with no board to navigate to", () => {
    const data = makeHomeData({ projects: [], myFocus: { overdue: [], dueToday: [], inProgress: [] } });
    vi.mocked(useWorkspaceHome).mockReturnValue({
      data,
      isLoading: false,
      isFetching: false,
      refetch: refetchSpy,
    } as unknown as ReturnType<typeof useWorkspaceHome>);

    const tree = renderDashboard("acme");
    const [focus] = collectByType(tree, HomeMyFocusSection);
    (focus.props as unknown as HomeMyFocusSectionProps).onNewTask?.();

    expect(pushSpy).not.toHaveBeenCalled();
  });
});

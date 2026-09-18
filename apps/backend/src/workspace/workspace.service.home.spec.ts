import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";
import { NotificationService } from "src/notification/notification.service";

describe("WorkspaceService.getHomeData", () => {
  let service: WorkspaceService;
  let prisma: {
    workspaceMember: { findMany: jest.Mock };
    task: { findMany: jest.Mock; count: jest.Mock };
    workspaceProject: { findMany: jest.Mock };
    workspaceModule: { findMany: jest.Mock };
    taskActivity: { findMany: jest.Mock };
  };
  let cache: { get: jest.Mock; set: jest.Mock };

  const baseMember = {
    role: "OWNER",
    user: { id: "user-1", firstname: "Amy", lastname: "Owner", avatar_key: null, status_preference: "ONLINE" },
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 16, 15, 0, 0));

    prisma = {
      workspaceMember: { findMany: jest.fn().mockResolvedValue([baseMember]) },
      task: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      workspaceProject: { findMany: jest.fn().mockResolvedValue([]) },
      workspaceModule: { findMany: jest.fn().mockResolvedValue([]) },
      taskActivity: { findMany: jest.fn().mockResolvedValue([]) },
    };
    cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    service = new WorkspaceService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      {} as unknown as StatusGateway,
      {} as unknown as StorageService,
      {} as unknown as NotificationService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns cached data immediately without querying prisma", async () => {
    const cached = { summary: { workspaceMembersCount: 1 } };
    cache.get.mockResolvedValue(cached);

    const result = await service.getHomeData("ws-1", "user-1");

    expect(result).toBe(cached);
    expect(prisma.workspaceMember.findMany).not.toHaveBeenCalled();
  });

  it("aggregates tasks, projects, crew, activity, and summary on a cache miss", async () => {
    prisma.workspaceMember.findMany.mockResolvedValue([
      baseMember,
      { role: "MEMBER", user: { id: "user-2", firstname: "Bob", lastname: "Member", avatar_key: "k.png", status_preference: "AWAY" } },
    ]);

    const focusTask = {
      id: "task-1",
      shortId: "TSK-1",
      title: "Ship it",
      priority: "HIGH",
      due_date: null,
      column: { id: "col-1", name: "Doing", type: "ONGOING", board_id: "board-1", board: { id: "board-1", name: "Main" } },
      checklistItems: [{ is_completed: true }, { is_completed: false }],
      _count: { comments: 2, attachments: 1 },
    };
    prisma.task.findMany.mockResolvedValueOnce([focusTask]).mockResolvedValueOnce([
      { id: "task-1", column: { type: "ONGOING", board_id: "board-1" }, assignee: { id: "user-1", firstname: "Amy", lastname: "Owner", avatar_key: null } },
    ]);
    prisma.task.count.mockResolvedValue(3);

    prisma.workspaceProject.findMany.mockResolvedValue([{ id: "proj-1", name: "Launch", color: "#fff", position: 0 }]);
    prisma.workspaceModule.findMany
      .mockResolvedValueOnce([{ id: "mod-1", project_id: "proj-1", reference_id: "board-1" }])
      .mockResolvedValueOnce([{ id: "mod-2", name: "Main board", type: "BOARD", color: null, position: 0 }]);

    prisma.taskActivity.findMany.mockResolvedValue([
      {
        id: "act-1",
        type: "COLUMN_MOVED",
        metadata: { toColumnName: "Done" },
        created_at: new Date("2026-09-16T10:00:00.000Z"),
        actor: { id: "user-2", firstname: "Bob", lastname: "Member", avatar_key: null },
        task: { id: "task-1", title: "Ship it", column: { board_id: "board-1" } },
      },
    ]);

    const result = await service.getHomeData("ws-1", "user-1");

    expect(result.crew).toHaveLength(2);
    expect(result.myFocus.inProgress).toHaveLength(1);
    expect(result.myFocus.inProgress[0]).toMatchObject({
      id: "task-1",
      shortId: "TSK-1",
      projectId: "proj-1",
      projectName: "Launch",
      checklistTotal: 2,
      checklistCompleted: 1,
      commentsCount: 2,
      attachmentsCount: 1,
    });
    expect(result.projects[0]).toMatchObject({
      id: "proj-1",
      totalTasks: 1,
      completedTasks: 0,
      progressPercentage: 0,
    });
    expect(result.pinnedModules).toEqual([
      { id: "mod-2", name: "Main board", type: "BOARD", isPinned: true, color: null },
    ]);
    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]).toMatchObject({
      id: "act-1",
      type: "task_moved",
      message: "moved the task to Done",
      target: { id: "task-1", title: "Ship it", href: "/board/board-1" },
    });
    expect(result.summary).toMatchObject({
      urgentCount: 0,
      activeTasksCount: 1,
      completionVelocity: 3,
      workspaceMembersCount: 2,
    });
    expect(cache.set).toHaveBeenCalledWith("ws:ws-1:home:user-1", result, 120);
  });

  it("correctly partitions tasks into overdue, dueToday, and inProgress", async () => {
    const makeTask = (id: string, dueDate: Date | null, columnType: string) => ({
      id,
      shortId: `TSK-${id}`,
      title: id,
      priority: "MEDIUM",
      due_date: dueDate,
      column: { id: "col-1", name: columnType, type: columnType, board_id: "board-1", board: { id: "board-1", name: "Main" } },
      checklistItems: [],
      _count: { comments: 0, attachments: 0 },
    });

    prisma.task.findMany.mockResolvedValueOnce([
      makeTask("overdue-task", new Date(2026, 8, 15, 8), "ONGOING"),
      makeTask("due-today-task", new Date(2026, 8, 16, 8), "UPCOMING"),
      makeTask("in-progress-task", null, "ONGOING"),
      makeTask("completed-task", new Date(2026, 8, 10, 8), "COMPLETE"),
    ]).mockResolvedValueOnce([]);

    const result = await service.getHomeData("ws-1", "user-1");

    expect(result.myFocus.overdue.map((t) => t.id)).toEqual(["overdue-task"]);
    expect(result.myFocus.dueToday.map((t) => t.id)).toEqual(["due-today-task"]);
    expect(result.myFocus.inProgress.map((t) => t.id)).toEqual(["in-progress-task"]);
  });

  it("handles 0 projects, 0 tasks, and 0 activities without crashing", async () => {
    const result = await service.getHomeData("ws-1", "user-1");

    expect(result.myFocus).toEqual({ overdue: [], dueToday: [], inProgress: [] });
    expect(result.projects).toEqual([]);
    expect(result.recentActivity).toEqual([]);
    expect(result.summary.activeTasksCount).toBe(0);
    expect(result.summary.urgentCount).toBe(0);
  });

  it("caches the computed result with CacheTTL.WORKSPACE_HOME", async () => {
    await service.getHomeData("ws-1", "user-1");

    expect(cache.set).toHaveBeenCalledWith("ws:ws-1:home:user-1", expect.any(Object), 120);
  });
});

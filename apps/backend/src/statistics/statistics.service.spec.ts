import { StatisticsService } from "./statistics.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";

function makeService() {
  const prisma = {
    task: { findMany: jest.fn() },
    workspaceMember: { findMany: jest.fn() },
    workspaceProject: { findMany: jest.fn() },
    workspaceModule: { findMany: jest.fn() },
    board: { findMany: jest.fn() },
  };

  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const service = new StatisticsService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
  );

  return { service, prisma, cache };
}

describe("StatisticsService calculateDelta", () => {
  const { service } = makeService();

  it("calculates delta for positive sentiment when current > previous", () => {
    const delta = service.calculateDelta(10, 5, "positive");
    expect(delta).toEqual({
      current: 10,
      previous: 5,
      deltaPercent: 100,
      trend: "up",
      sentiment: "positive",
    });
  });

  it("calculates delta for positive sentiment when current < previous", () => {
    const delta = service.calculateDelta(5, 10, "positive");
    expect(delta).toEqual({
      current: 5,
      previous: 10,
      deltaPercent: -50,
      trend: "down",
      sentiment: "negative",
    });
  });

  it("calculates delta for inverse sentiment when current > previous", () => {
    const delta = service.calculateDelta(10, 5, "inverse");
    expect(delta).toEqual({
      current: 10,
      previous: 5,
      deltaPercent: 100,
      trend: "up",
      sentiment: "negative",
    });
  });

  it("calculates delta for inverse sentiment when current < previous", () => {
    const delta = service.calculateDelta(5, 10, "inverse");
    expect(delta).toEqual({
      current: 5,
      previous: 10,
      deltaPercent: -50,
      trend: "down",
      sentiment: "positive",
    });
  });

  it("returns 0 percent and neutral sentiment when current equals previous", () => {
    const delta = service.calculateDelta(5, 5, "positive");
    expect(delta).toEqual({
      current: 5,
      previous: 5,
      deltaPercent: 0,
      trend: "neutral",
      sentiment: "neutral",
    });
  });

  it("returns 0 percent when both previous and current are 0", () => {
    const delta = service.calculateDelta(0, 0, "positive");
    expect(delta).toEqual({
      current: 0,
      previous: 0,
      deltaPercent: 0,
      trend: "neutral",
      sentiment: "neutral",
    });
  });

  it("returns null deltaPercent when previous is 0 and current > 0", () => {
    const delta = service.calculateDelta(5, 0, "positive");
    expect(delta).toEqual({
      current: 5,
      previous: 0,
      deltaPercent: null,
      trend: "up",
      sentiment: "positive",
    });
  });
});

describe("StatisticsService getWorkspaceStatistics caching", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns cached data on cache hit without querying database", async () => {
    const { service, prisma, cache } = makeService();
    const cachedData = { interval: "30d", summary: {} } as unknown;
    cache.get.mockResolvedValue(cachedData);

    const result = await service.getWorkspaceStatistics("ws-1", "user-1");

    expect(result).toBe(cachedData);
    expect(cache.get).toHaveBeenCalledWith(
      "ws:ws-1:statistics:30d:all:all:user-1",
    );
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it("computes, caches with 300s TTL, and returns on cache miss", async () => {
    const { service, prisma, cache } = makeService();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.workspaceMember.findMany.mockResolvedValue([]);
    prisma.workspaceProject.findMany.mockResolvedValue([]);
    prisma.workspaceModule.findMany.mockResolvedValue([]);
    prisma.board.findMany.mockResolvedValue([]);

    const result = await service.getWorkspaceStatistics("ws-1", "user-1", {
      interval: "7d",
      projectId: "proj-1",
      boardId: "board-1",
    });

    expect(result.interval).toBe("7d");
    expect(cache.set).toHaveBeenCalledWith(
      "ws:ws-1:statistics:7d:proj-1:board-1:user-1",
      expect.objectContaining({ interval: "7d" }),
      300,
    );
  });
});

describe("StatisticsService intervals and filters", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("generates correct number of timeseries points per interval", async () => {
    const { service, prisma } = makeService();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.workspaceMember.findMany.mockResolvedValue([]);
    prisma.workspaceProject.findMany.mockResolvedValue([]);
    prisma.workspaceModule.findMany.mockResolvedValue([]);
    prisma.board.findMany.mockResolvedValue([]);

    const res7d = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "7d" });
    expect(res7d.timeseries).toHaveLength(7);

    const res14d = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "14d" });
    expect(res14d.timeseries).toHaveLength(14);

    const res30d = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "30d" });
    expect(res30d.timeseries).toHaveLength(30);

    const res90d = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "90d" });
    expect(res90d.timeseries).toHaveLength(90);

    const res6m = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "6m" });
    expect(res6m.timeseries).toHaveLength(180);

    const res1y = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "1y" });
    expect(res1y.timeseries).toHaveLength(365);

    const resAll = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "all" });
    expect(resAll.timeseries).toHaveLength(730);
  });

  it("resolves project board IDs when projectId is provided", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findMany.mockResolvedValue([
      { reference_id: "board-1", project_id: "proj-1" },
      { reference_id: "board-2", project_id: "proj-1" },
    ]);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.workspaceMember.findMany.mockResolvedValue([]);
    prisma.workspaceProject.findMany.mockResolvedValue([]);
    prisma.board.findMany.mockResolvedValue([]);

    await service.getWorkspaceStatistics("ws-1", "user-1", { projectId: "proj-1" });

    expect(prisma.workspaceModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspace_id: "ws-1",
          project_id: "proj-1",
          type: "BOARD",
        },
      }),
    );
  });
});

describe("StatisticsService metric aggregations", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("computes summary metrics, member workloads, distributions, personal metrics, and projects breakdown", async () => {
    const { service, prisma } = makeService();

    const mockTasks = [
      {
        id: "task-1",
        column_id: "col-1",
        priority: "URGENT",
        assignee_id: "user-1",
        created_by: "user-1",
        due_date: new Date("2026-09-14T00:00:00.000Z"),
        in_progress_at: new Date("2026-09-10T10:00:00.000Z"),
        completed_at: new Date("2026-09-12T10:00:00.000Z"),
        created_at: new Date("2026-09-08T00:00:00.000Z"),
        column: { id: "col-1", name: "Done", type: "COMPLETE", board_id: "board-1" },
      },
      {
        id: "task-2",
        column_id: "col-2",
        priority: "HIGH",
        assignee_id: "user-1",
        created_by: "user-2",
        due_date: new Date("2026-09-10T00:00:00.000Z"),
        in_progress_at: new Date("2026-09-11T00:00:00.000Z"),
        completed_at: null,
        created_at: new Date("2026-09-09T00:00:00.000Z"),
        column: { id: "col-2", name: "In Progress", type: "ONGOING", board_id: "board-1" },
      },
      {
        id: "task-3",
        column_id: "col-3",
        priority: "MEDIUM",
        assignee_id: "user-2",
        created_by: "user-2",
        due_date: null,
        in_progress_at: null,
        completed_at: null,
        created_at: new Date("2026-09-14T00:00:00.000Z"),
        column: { id: "col-3", name: "Backlog", type: "UPCOMING", board_id: "board-2" },
      },
      {
        id: "task-4",
        column_id: "col-1",
        priority: "LOW",
        assignee_id: "user-2",
        created_by: "user-1",
        due_date: new Date("2026-08-15T00:00:00.000Z"),
        in_progress_at: new Date("2026-08-10T00:00:00.000Z"),
        completed_at: new Date("2026-08-14T00:00:00.000Z"),
        created_at: new Date("2026-08-05T00:00:00.000Z"),
        column: { id: "col-1", name: "Done", type: "COMPLETE", board_id: "board-1" },
      },
    ];

    prisma.task.findMany.mockResolvedValue(mockTasks);
    prisma.workspaceMember.findMany.mockResolvedValue([
      {
        user_id: "user-1",
        user: {
          id: "user-1",
          firstname: "Alice",
          lastname: "Smith",
          username: "alice",
          avatar_key: "avatar-1",
        },
      },
      {
        user_id: "user-2",
        user: {
          id: "user-2",
          firstname: "Bob",
          lastname: "Jones",
          username: "bob",
          avatar_key: null,
        },
      },
    ]);
    prisma.workspaceProject.findMany.mockResolvedValue([
      { id: "proj-1", name: "Core App", color: "#ff0000", position: 1000 },
    ]);
    prisma.workspaceModule.findMany.mockResolvedValue([
      { reference_id: "board-1", project_id: "proj-1", position: 1000 },
    ]);
    prisma.board.findMany.mockResolvedValue([
      { id: "board-1", name: "Dev Board" },
      { id: "board-2", name: "Design Board" },
    ]);

    const result = await service.getWorkspaceStatistics("ws-1", "user-1", { interval: "30d" });

    expect(result.summary.velocity.current).toBe(1);
    expect(result.summary.velocity.previous).toBe(1);
    expect(result.summary.velocity.trend).toBe("neutral");

    expect(result.summary.created.current).toBe(3);
    expect(result.summary.created.previous).toBe(1);
    expect(result.summary.created.trend).toBe("up");

    expect(result.summary.overdueTasks.current).toBe(1);
    expect(result.summary.cycleTimeSeconds.current).toBe(172800);

    expect(result.priorityDistribution).toEqual({
      urgent: 1,
      high: 1,
      medium: 1,
      low: 1,
      none: 0,
    });

    expect(result.statusDistribution).toEqual({
      upcoming: 1,
      ongoing: 1,
      complete: 2,
    });

    expect(result.memberWorkloads).toHaveLength(2);
    const aliceWorkload = result.memberWorkloads.find((m) => m.userId === "user-1");
    expect(aliceWorkload).toEqual({
      userId: "user-1",
      name: "Alice Smith",
      username: "alice",
      avatarKey: "avatar-1",
      activeTasks: 1,
      completedTasks: 1,
      overdueTasks: 1,
      avgCycleTimeSeconds: 172800,
    });

    expect(result.personal.activeWorkload).toBe(1);
    expect(result.personal.velocity.current).toBe(1);
    expect(result.personal.onTimeRate.current).toBe(100);
    expect(result.personal.activityHeatmap).toHaveLength(365);
    expect(result.personal.totalActiveDays).toBeGreaterThan(0);

    expect(result.projects).toHaveLength(2);
    const coreProject = result.projects.find((p) => p.projectId === "proj-1");
    expect(coreProject?.projectName).toBe("Core App");
    expect(coreProject?.boards).toHaveLength(1);
    expect(coreProject?.boards[0].boardName).toBe("Dev Board");

    const standaloneProject = result.projects.find((p) => p.projectId === "unassigned");
    expect(standaloneProject?.boards).toHaveLength(1);
    expect(standaloneProject?.boards[0].boardName).toBe("Design Board");
  });
});

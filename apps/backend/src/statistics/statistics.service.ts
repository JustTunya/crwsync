import { Injectable } from "@nestjs/common";
import { ModuleTypeEnum } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import {
  WorkspaceStatisticsData,
  StatisticsInterval,
  MetricDelta,
  StatisticsTimeseriesPoint,
  MemberWorkloadStat,
  ActivityHeatmapDay,
  ProjectStatBreakdown,
  BoardStatBreakdown,
} from "@crwsync/types";
import { StatisticsQueryDto } from "./dto/statistics.dto";

const DAY_IN_MS = 86400000;
const CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  calculateDelta(
    current: number,
    previous: number,
    direction: "positive" | "inverse",
  ): MetricDelta {
    let deltaPercent: number | null = null;
    if (previous === 0) {
      deltaPercent = current === 0 ? 0 : null;
    } else {
      deltaPercent = Math.round(((current - previous) / previous) * 1000) / 10;
    }

    const trend: "up" | "down" | "neutral" =
      current > previous ? "up" : current < previous ? "down" : "neutral";

    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    if (trend !== "neutral") {
      if (direction === "positive") {
        sentiment = trend === "up" ? "positive" : "negative";
      } else {
        sentiment = trend === "down" ? "positive" : "negative";
      }
    }

    return {
      current,
      previous,
      deltaPercent,
      trend,
      sentiment,
    };
  }

  private getIntervalDays(interval: StatisticsInterval): number {
    switch (interval) {
      case "7d":
        return 7;
      case "14d":
        return 14;
      case "30d":
        return 30;
      case "90d":
        return 90;
      case "6m":
        return 180;
      case "1y":
        return 365;
      case "all":
        return 730;
      default:
        return 30;
    }
  }

  private getTaskCycleTime(task: {
    in_progress_at: Date | null;
    completed_at: Date | null;
  }): number | null {
    if (!task.in_progress_at || !task.completed_at) return null;
    const inProgress = new Date(task.in_progress_at).getTime();
    const completed = new Date(task.completed_at).getTime();
    if (completed < inProgress) return null;
    return Math.round((completed - inProgress) / 1000);
  }

  private calculateAvgCycleTime(
    tasks: Array<{ in_progress_at: Date | null; completed_at: Date | null }>,
  ): number {
    const cycleTimes = tasks
      .map((t) => this.getTaskCycleTime(t))
      .filter((ct): ct is number => ct !== null);
    if (cycleTimes.length === 0) return 0;
    const sum = cycleTimes.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / cycleTimes.length);
  }

  async getWorkspaceStatistics(
    workspaceId: string,
    userId: string,
    query?: StatisticsQueryDto,
  ): Promise<WorkspaceStatisticsData> {
    const interval: StatisticsInterval = query?.interval || "30d";
    const projectId = query?.projectId;
    const boardId = query?.boardId;

    const cacheKey = `ws:${workspaceId}:statistics:${interval}:${projectId || "all"}:${boardId || "all"}:${userId}`;
    const cached = await this.cache.get<WorkspaceStatisticsData>(cacheKey);
    if (cached) {
      return cached;
    }

    const intervalDays = this.getIntervalDays(interval);
    const now = new Date();
    const currentStart = new Date(now.getTime() - intervalDays * DAY_IN_MS);
    const previousStart = new Date(currentStart.getTime() - intervalDays * DAY_IN_MS);

    let filteredBoardIds: string[] | null = null;
    if (boardId) {
      filteredBoardIds = [boardId];
    } else if (projectId) {
      if (projectId === "unassigned") {
        const standaloneBoardModules = await this.prisma.workspaceModule.findMany({
          where: {
            workspace_id: workspaceId,
            project_id: null,
            type: ModuleTypeEnum.BOARD,
          },
          select: { reference_id: true },
        });
        filteredBoardIds = standaloneBoardModules.map((m) => m.reference_id);
      } else {
        const projectModules = await this.prisma.workspaceModule.findMany({
          where: {
            workspace_id: workspaceId,
            project_id: projectId,
            type: ModuleTypeEnum.BOARD,
          },
          select: { reference_id: true },
        });
        filteredBoardIds = projectModules.map((m) => m.reference_id);
      }
    }

    const [allTasks, members, projects, boardModules, boards] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          workspace_id: workspaceId,
          is_deleted: false,
        },
        select: {
          id: true,
          column_id: true,
          priority: true,
          assignee_id: true,
          created_by: true,
          due_date: true,
          in_progress_at: true,
          completed_at: true,
          created_at: true,
          column: {
            select: {
              id: true,
              name: true,
              type: true,
              board_id: true,
            },
          },
        },
      }),
      this.prisma.workspaceMember.findMany({
        where: { workspace_id: workspaceId },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              username: true,
              avatar_key: true,
            },
          },
        },
        orderBy: { joined_at: "asc" },
      }),
      this.prisma.workspaceProject.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { position: "asc" },
      }),
      this.prisma.workspaceModule.findMany({
        where: {
          workspace_id: workspaceId,
          type: ModuleTypeEnum.BOARD,
        },
        orderBy: { position: "asc" },
      }),
      this.prisma.board.findMany({
        where: { workspace_id: workspaceId },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const filteredTasks =
      filteredBoardIds !== null
        ? allTasks.filter((t) => filteredBoardIds.includes(t.column.board_id))
        : allTasks;

    const currentCompletedTasks = filteredTasks.filter(
      (t) =>
        t.completed_at &&
        new Date(t.completed_at) >= currentStart &&
        new Date(t.completed_at) <= now,
    );
    const prevCompletedTasks = filteredTasks.filter(
      (t) =>
        t.completed_at &&
        new Date(t.completed_at) >= previousStart &&
        new Date(t.completed_at) < currentStart,
    );

    const currentCreatedTasks = filteredTasks.filter(
      (t) =>
        t.created_at &&
        new Date(t.created_at) >= currentStart &&
        new Date(t.created_at) <= now,
    );
    const prevCreatedTasks = filteredTasks.filter(
      (t) =>
        t.created_at &&
        new Date(t.created_at) >= previousStart &&
        new Date(t.created_at) < currentStart,
    );

    const velocity = this.calculateDelta(
      currentCompletedTasks.length,
      prevCompletedTasks.length,
      "positive",
    );
    const created = this.calculateDelta(
      currentCreatedTasks.length,
      prevCreatedTasks.length,
      "positive",
    );

    const currentThroughput =
      currentCreatedTasks.length > 0
        ? Math.round((currentCompletedTasks.length / currentCreatedTasks.length) * 100) / 100
        : currentCompletedTasks.length > 0
          ? currentCompletedTasks.length
          : 0;
    const prevThroughput =
      prevCreatedTasks.length > 0
        ? Math.round((prevCompletedTasks.length / prevCreatedTasks.length) * 100) / 100
        : prevCompletedTasks.length > 0
          ? prevCompletedTasks.length
          : 0;
    const throughputRatio = this.calculateDelta(currentThroughput, prevThroughput, "positive");

    const currentAvgCycle = this.calculateAvgCycleTime(currentCompletedTasks);
    const prevAvgCycle = this.calculateAvgCycleTime(prevCompletedTasks);
    const cycleTimeSeconds = this.calculateDelta(currentAvgCycle, prevAvgCycle, "inverse");

    const currentOverdue = filteredTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.column.type !== "COMPLETE",
    ).length;
    const prevOverdue = filteredTasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < currentStart &&
        (!t.completed_at || new Date(t.completed_at) > currentStart),
    ).length;
    const overdueTasks = this.calculateDelta(currentOverdue, prevOverdue, "inverse");

    const currentOngoing = filteredTasks.filter((t) => t.column.type === "ONGOING").length;
    const currentUpcoming = filteredTasks.filter((t) => t.column.type === "UPCOMING").length;
    const currentTotal = currentCompletedTasks.length + currentOngoing + currentUpcoming;
    const currentRate =
      currentTotal > 0 ? Math.round((currentCompletedTasks.length / currentTotal) * 1000) / 10 : 0;
    const prevTotal = prevCreatedTasks.length > 0 ? prevCreatedTasks.length : prevCompletedTasks.length;
    const prevRate =
      prevTotal > 0 ? Math.round((prevCompletedTasks.length / prevTotal) * 1000) / 10 : 0;
    const completionRate = this.calculateDelta(currentRate, prevRate, "positive");

    const dateBuckets = new Map<string, { created: number; completed: number }>();
    for (const task of filteredTasks) {
      if (task.created_at) {
        const dStr = new Date(task.created_at).toISOString().slice(0, 10);
        const b = dateBuckets.get(dStr) || { created: 0, completed: 0 };
        b.created++;
        dateBuckets.set(dStr, b);
      }
      if (task.completed_at) {
        const dStr = new Date(task.completed_at).toISOString().slice(0, 10);
        const b = dateBuckets.get(dStr) || { created: 0, completed: 0 };
        b.completed++;
        dateBuckets.set(dStr, b);
      }
    }

    const timeseries: StatisticsTimeseriesPoint[] = [];
    for (let i = intervalDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_IN_MS);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      const b = dateBuckets.get(dateStr) || { created: 0, completed: 0 };
      timeseries.push({
        date: dateStr,
        label,
        created: b.created,
        completed: b.completed,
      });
    }

    const memberWorkloads: MemberWorkloadStat[] = members.map((member) => {
      const memberTasks = filteredTasks.filter((t) => t.assignee_id === member.user_id);
      const activeTasks = memberTasks.filter((t) => t.column.type === "ONGOING").length;
      const memberCompleted = memberTasks.filter(
        (t) =>
          t.completed_at &&
          new Date(t.completed_at) >= currentStart &&
          new Date(t.completed_at) <= now,
      );
      const overdue = memberTasks.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.column.type !== "COMPLETE",
      ).length;

      const cycleTimes = memberCompleted
        .map((t) => this.getTaskCycleTime(t))
        .filter((ct): ct is number => ct !== null);
      const avgCycleTimeSeconds =
        cycleTimes.length > 0
          ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
          : null;

      const name =
        `${member.user.firstname} ${member.user.lastname}`.trim() || member.user.username;

      return {
        userId: member.user_id,
        name,
        username: member.user.username,
        avatarKey: member.user.avatar_key,
        activeTasks,
        completedTasks: memberCompleted.length,
        overdueTasks: overdue,
        avgCycleTimeSeconds,
      };
    });

    const priorityDistribution = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };
    for (const task of filteredTasks) {
      switch (task.priority) {
        case "URGENT":
          priorityDistribution.urgent++;
          break;
        case "HIGH":
          priorityDistribution.high++;
          break;
        case "MEDIUM":
          priorityDistribution.medium++;
          break;
        case "LOW":
          priorityDistribution.low++;
          break;
        case "NONE":
        default:
          priorityDistribution.none++;
          break;
      }
    }

    const statusDistribution = {
      upcoming: 0,
      ongoing: 0,
      complete: 0,
    };
    for (const task of filteredTasks) {
      switch (task.column.type) {
        case "UPCOMING":
          statusDistribution.upcoming++;
          break;
        case "ONGOING":
          statusDistribution.ongoing++;
          break;
        case "COMPLETE":
          statusDistribution.complete++;
          break;
      }
    }

    const userTasks = filteredTasks.filter((t) => t.assignee_id === userId);
    const userActiveWorkload = userTasks.filter((t) => t.column.type === "ONGOING").length;
    const userCurrentCompleted = userTasks.filter(
      (t) =>
        t.completed_at &&
        new Date(t.completed_at) >= currentStart &&
        new Date(t.completed_at) <= now,
    );
    const userPrevCompleted = userTasks.filter(
      (t) =>
        t.completed_at &&
        new Date(t.completed_at) >= previousStart &&
        new Date(t.completed_at) < currentStart,
    );

    const userVelocity = this.calculateDelta(
      userCurrentCompleted.length,
      userPrevCompleted.length,
      "positive",
    );

    const userCurrentAvgCycle = this.calculateAvgCycleTime(userCurrentCompleted);
    const userPrevAvgCycle = this.calculateAvgCycleTime(userPrevCompleted);
    const userCycleTimeDelta = this.calculateDelta(
      userCurrentAvgCycle,
      userPrevAvgCycle,
      "inverse",
    );

    const userCurrentTasksWithDue = userCurrentCompleted.filter((t) => t.due_date !== null);
    const userCurrentOnTime = userCurrentTasksWithDue.filter(
      (t) => new Date(t.completed_at!) <= new Date(t.due_date!),
    );
    const currentOnTimeRate =
      userCurrentTasksWithDue.length > 0
        ? Math.round((userCurrentOnTime.length / userCurrentTasksWithDue.length) * 1000) / 10
        : 100;

    const userPrevTasksWithDue = userPrevCompleted.filter((t) => t.due_date !== null);
    const userPrevOnTime = userPrevTasksWithDue.filter(
      (t) => new Date(t.completed_at!) <= new Date(t.due_date!),
    );
    const prevOnTimeRate =
      userPrevTasksWithDue.length > 0
        ? Math.round((userPrevOnTime.length / userPrevTasksWithDue.length) * 1000) / 10
        : 100;

    const userOnTimeDelta = this.calculateDelta(
      currentOnTimeRate,
      prevOnTimeRate,
      "positive",
    );

    const userActivityBuckets = new Map<string, number>();
    for (const task of allTasks) {
      const isUserTask = task.assignee_id === userId || task.created_by === userId;
      if (!isUserTask) continue;
      if (task.completed_at) {
        const dStr = new Date(task.completed_at).toISOString().slice(0, 10);
        userActivityBuckets.set(dStr, (userActivityBuckets.get(dStr) || 0) + 1);
      } else if (task.created_at) {
        const dStr = new Date(task.created_at).toISOString().slice(0, 10);
        userActivityBuckets.set(dStr, (userActivityBuckets.get(dStr) || 0) + 1);
      }
    }

    const activityHeatmap: ActivityHeatmapDay[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_IN_MS);
      const dateStr = d.toISOString().slice(0, 10);
      const count = userActivityBuckets.get(dateStr) || 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4;
      activityHeatmap.push({ date: dateStr, count, level });
    }

    const totalActiveDays = activityHeatmap.filter((day) => day.count > 0).length;

    let streakDays = 0;
    const todayIndex = activityHeatmap.length - 1;
    if (todayIndex >= 0) {
      const todayCount = activityHeatmap[todayIndex].count;
      let startIndex = todayIndex;
      if (todayCount === 0 && todayIndex > 0 && activityHeatmap[todayIndex - 1].count > 0) {
        startIndex = todayIndex - 1;
      }
      if (activityHeatmap[startIndex].count > 0) {
        for (let i = startIndex; i >= 0; i--) {
          if (activityHeatmap[i].count > 0) {
            streakDays++;
          } else {
            break;
          }
        }
      }
    }

    const projectBreakdowns: ProjectStatBreakdown[] = projects.map((project) => {
      const projectBoardModules = boardModules.filter((m) => m.project_id === project.id);
      const projectBoardIds = new Set(projectBoardModules.map((m) => m.reference_id));
      const projectBoards = boards.filter((b) => projectBoardIds.has(b.id));

      const boardStats: BoardStatBreakdown[] = projectBoards.map((b) => {
        const boardTasks = allTasks.filter((t) => t.column.board_id === b.id);
        const totalTasks = boardTasks.length;
        const completedTasks = boardTasks.filter((t) => t.column.type === "COMPLETE").length;
        const ongoingTasks = boardTasks.filter((t) => t.column.type === "ONGOING").length;
        const upcomingTasks = boardTasks.filter((t) => t.column.type === "UPCOMING").length;
        const boardCompletionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

        const boardCompleted = boardTasks.filter((t) => t.completed_at);
        const cycleTimes = boardCompleted
          .map((t) => this.getTaskCycleTime(t))
          .filter((ct): ct is number => ct !== null);
        const avgCycleTimeSeconds =
          cycleTimes.length > 0
            ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
            : null;

        return {
          boardId: b.id,
          boardName: b.name,
          totalTasks,
          completedTasks,
          upcomingTasks,
          ongoingTasks,
          completionRate: boardCompletionRate,
          avgCycleTimeSeconds,
        };
      });

      const totalTasks = boardStats.reduce((acc, b) => acc + b.totalTasks, 0);
      const completedTasks = boardStats.reduce((acc, b) => acc + b.completedTasks, 0);
      const projectCompletionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        color: project.color,
        totalTasks,
        completedTasks,
        completionRate: projectCompletionRate,
        boards: boardStats,
      };
    });

    const assignedBoardIds = new Set(
      boardModules.filter((m) => m.project_id !== null).map((m) => m.reference_id),
    );
    const standaloneBoards = boards.filter((b) => !assignedBoardIds.has(b.id));

    if (standaloneBoards.length > 0) {
      const standaloneBoardStats: BoardStatBreakdown[] = standaloneBoards.map((b) => {
        const boardTasks = allTasks.filter((t) => t.column.board_id === b.id);
        const totalTasks = boardTasks.length;
        const completedTasks = boardTasks.filter((t) => t.column.type === "COMPLETE").length;
        const ongoingTasks = boardTasks.filter((t) => t.column.type === "ONGOING").length;
        const upcomingTasks = boardTasks.filter((t) => t.column.type === "UPCOMING").length;
        const boardCompletionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

        const boardCompleted = boardTasks.filter((t) => t.completed_at);
        const cycleTimes = boardCompleted
          .map((t) => this.getTaskCycleTime(t))
          .filter((ct): ct is number => ct !== null);
        const avgCycleTimeSeconds =
          cycleTimes.length > 0
            ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
            : null;

        return {
          boardId: b.id,
          boardName: b.name,
          totalTasks,
          completedTasks,
          upcomingTasks,
          ongoingTasks,
          completionRate: boardCompletionRate,
          avgCycleTimeSeconds,
        };
      });

      const totalTasks = standaloneBoardStats.reduce((acc, b) => acc + b.totalTasks, 0);
      const completedTasks = standaloneBoardStats.reduce((acc, b) => acc + b.completedTasks, 0);
      const standaloneCompletionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

      projectBreakdowns.push({
        projectId: "unassigned",
        projectName: projects.length === 0 ? "General" : "Other Boards",
        color: null,
        totalTasks,
        completedTasks,
        completionRate: standaloneCompletionRate,
        boards: standaloneBoardStats,
      });
    }

    const result: WorkspaceStatisticsData = {
      interval,
      summary: {
        velocity,
        created,
        throughputRatio,
        cycleTimeSeconds,
        overdueTasks,
        completionRate,
      },
      timeseries,
      memberWorkloads,
      priorityDistribution,
      statusDistribution,
      personal: {
        activeWorkload: userActiveWorkload,
        velocity: userVelocity,
        cycleTimeSeconds: userCycleTimeDelta,
        onTimeRate: userOnTimeDelta,
        activityHeatmap,
        streakDays,
        totalActiveDays,
      },
      projects: projectBreakdowns,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS);

    return result;
  }
}

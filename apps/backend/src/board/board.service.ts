import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { ModuleTypeEnum, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService, CacheKeys } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { NotificationService } from "src/notification/notification.service";
import {
  CreateBoardDto,
  UpdateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  ReorderColumnsDto,
  ReorderModulesDto,
  UpdateModuleDto,
  CreateProjectDto,
  UpdateProjectDto,
} from "src/board/dto/board.dto";
import { GetSchedulesQueryDto } from "src/board/dto/schedule.dto";

const POSITION_GAP = 1000;
const ACTIVITY_ACTOR_SELECT = { id: true, firstname: true, lastname: true, avatar_key: true };

@Injectable()
export class BoardService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private statusGateway: StatusGateway,
    private notificationService: NotificationService,
  ) {}

  async createBoard(workspaceId: string, userId: string, dto: CreateBoardDto) {
    const lastModule = await this.prisma.workspaceModule.findFirst({
      where: { workspace_id: workspaceId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (lastModule?.position ?? 0) + POSITION_GAP;

    const [board, wsModule] = await this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          workspace_id: workspaceId,
          name: dto.name,
          description: dto.description,
          created_by: userId,
        },
      });

      const wsModule = await tx.workspaceModule.create({
        data: {
          workspace_id: workspaceId,
          project_id: dto.project_id || null,
          type: ModuleTypeEnum.BOARD,
          reference_id: board.id,
          name: dto.name,
          position: nextPosition,
        },
      });

      return [board, wsModule];
    });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:created", wsModule);

    return { success: true, data: board };
  }

  async getBoards(workspaceId: string) {
    const boards = await this.prisma.board.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: "desc" },
    });

    return { success: true, data: boards };
  }

  async getBoard(workspaceId: string, boardId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, workspace_id: workspaceId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tasks: {
              where: {
                is_deleted: false,
                is_archived: false,
              },
              orderBy: { position: "asc" },
              include: {
                attachments: { orderBy: { created_at: "asc" } },
                checklistItems: { orderBy: { position: "asc" } },
                _count: { select: { comments: { where: { is_deleted: false } } } },
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException("Board not found");
    }

    return { success: true, data: board };
  }

  async updateBoard(workspaceId: string, boardId: string, dto: UpdateBoardDto) {
    const existing = await this.prisma.board.findFirst({
      where: { id: boardId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Board not found");

    const board = await this.prisma.board.update({
      where: { id: boardId },
      data: dto,
    });

    if (dto.name) {
      await this.prisma.workspaceModule.updateMany({
        where: { workspace_id: workspaceId, reference_id: boardId },
        data: { name: dto.name },
      });
    }

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:updated", { boardId, data: dto });

    return { success: true, data: board };
  }

  async deleteBoard(workspaceId: string, boardId: string) {
    const existing = await this.prisma.board.findFirst({
      where: { id: boardId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Board not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.board.delete({ where: { id: boardId } });
      await tx.workspaceModule.deleteMany({
        where: { workspace_id: workspaceId, reference_id: boardId },
      });
    });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:deleted", { referenceId: boardId });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:deleted", { boardId });

    return { success: true };
  }

  async createColumn(
    workspaceId: string,
    boardId: string,
    dto: CreateColumnDto,
  ) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!board) throw new NotFoundException("Board not found");

    const lastColumn = await this.prisma.boardColumn.findFirst({
      where: { board_id: boardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (lastColumn?.position ?? 0) + POSITION_GAP;

    const column = await this.prisma.boardColumn.create({
      data: {
        board_id: boardId,
        name: dto.name,
        color: dto.color,
        type: dto.type,
        position: nextPosition,
      },
    });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:column:created", { boardId, column });

    return { success: true, data: column };
  }

  async updateColumn(
    workspaceId: string,
    boardId: string,
    columnId: string,
    dto: UpdateColumnDto,
  ) {
    const existing = await this.prisma.boardColumn.findFirst({
      where: { id: columnId, board: { id: boardId, workspace_id: workspaceId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Column not found");

    const column = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: dto,
    });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:column:updated", { boardId, columnId, data: dto });

    return { success: true, data: column };
  }

  async deleteColumn(workspaceId: string, boardId: string, columnId: string) {
    const existing = await this.prisma.boardColumn.findFirst({
      where: { id: columnId, board: { id: boardId, workspace_id: workspaceId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Column not found");

    await this.prisma.boardColumn.delete({ where: { id: columnId } });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:column:deleted", { boardId, columnId });

    return { success: true };
  }

  async reorderColumns(
    workspaceId: string,
    boardId: string,
    dto: ReorderColumnsDto,
  ) {
    const count = await this.prisma.boardColumn.count({
      where: { id: { in: dto.column_ids }, board: { id: boardId, workspace_id: workspaceId } },
    });
    if (count !== dto.column_ids.length) {
      throw new NotFoundException("One or more columns not found on this board");
    }

    await this.prisma.$transaction(
      dto.column_ids.map((id, index) =>
        this.prisma.boardColumn.update({
          where: { id },
          data: { position: (index + 1) * POSITION_GAP },
        }),
      ),
    );

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:columns:reordered", { boardId, columnIds: dto.column_ids });

    return { success: true };
  }

  async createTask(
    workspaceId: string,
    boardId: string,
    dto: CreateTaskDto,
    userId: string,
  ) {
    const targetColumn = await this.prisma.boardColumn.findFirst({
      where: { id: dto.column_id, board: { id: boardId, workspace_id: workspaceId } },
      select: { type: true },
    });
    if (!targetColumn) {
      throw new NotFoundException("Column not found on this board");
    }

    const lockKey = `lock:column:${dto.column_id}:position`;
    const acquired = await this.cache.acquireLock(lockKey, 5);
    if (!acquired) {
      throw new ConflictException("This column is busy, please try again");
    }

    try {
      const lastTask = await this.prisma.task.findFirst({
        where: { column_id: dto.column_id },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const nextPosition = (lastTask?.position ?? 0) + POSITION_GAP;

      const updatedWorkspace = await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { taskSequenceCounter: { increment: 1 } },
        select: { workspaceKey: true, taskSequenceCounter: true },
      });

      const shortId = `${updatedWorkspace.workspaceKey}-${updatedWorkspace.taskSequenceCounter}`;

      const in_progress_at = targetColumn.type === "ONGOING" ? new Date() : null;
      const completed_at = targetColumn.type === "COMPLETE" ? new Date() : null;

      const task = await this.prisma.task.create({
        data: {
          column_id: dto.column_id,
          workspace_id: workspaceId,
          shortId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          labels: dto.labels ?? [],
          tags: dto.tags ?? [],
          assignee_id: dto.assignee_id,
          due_date: dto.due_date ? new Date(dto.due_date) : undefined,
          position: nextPosition,
          in_progress_at,
          completed_at,
          created_by: userId,
        },
      });

      await Promise.all([
        this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId)),
        this.cache.invalidatePattern(CacheKeys.workspaceHomePattern(workspaceId)),
      ]);

      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("board:task:created", { boardId, task });

      return { success: true, data: task };
    } finally {
      await this.cache.releaseLock(lockKey);
    }
  }

  async updateTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
  ) {
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { id: boardId, workspace_id: workspaceId } } },
      select: {
        priority: true,
        assignee_id: true,
        due_date: true,
        shortId: true,
        title: true,
        column: { select: { board: { select: { name: true, workspace: { select: { slug: true, name: true } } } } } },
      },
    });
    if (!existing) throw new NotFoundException("Task not found");

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.labels !== undefined) data.labels = dto.labels;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.assignee_id !== undefined) data.assignee_id = dto.assignee_id;
    if (dto.due_date !== undefined)
      data.due_date = dto.due_date ? new Date(dto.due_date) : null;
    if (dto.is_deleted !== undefined) data.is_deleted = dto.is_deleted;
    if (dto.is_archived !== undefined) data.is_archived = dto.is_archived;
    if (dto.in_progress_at !== undefined)
      data.in_progress_at = dto.in_progress_at ? new Date(dto.in_progress_at) : null;
    if (dto.completed_at !== undefined)
      data.completed_at = dto.completed_at ? new Date(dto.completed_at) : null;

    const activityInputs = await this.buildUpdateActivities(existing, dto);

    const [task, ...createdActivities] = await this.prisma.$transaction([
      this.prisma.task.update({ where: { id: taskId }, data }),
      ...activityInputs.map((activity) =>
        this.prisma.taskActivity.create({
          data: { task_id: taskId, actor_id: userId, type: activity.type, metadata: activity.metadata as Prisma.InputJsonValue },
          include: { actor: { select: ACTIVITY_ACTOR_SELECT } },
        }),
      ),
    ]);

    await Promise.all([
      this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId)),
      this.cache.invalidatePattern(CacheKeys.workspaceHomePattern(workspaceId)),
    ]);

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:updated", { boardId, taskId, data: dto });

    if (createdActivities.length) {
      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("task:activity:created", { boardId, taskId, activities: createdActivities });
    }

    if (dto.assignee_id && dto.assignee_id !== existing.assignee_id && dto.assignee_id !== userId) {
      const assignedBy = await this.prisma.user.findUnique({ where: { id: userId }, select: ACTIVITY_ACTOR_SELECT });
      await this.notificationService.create(dto.assignee_id, workspaceId, "TASK_ASSIGNED", {
        task: { id: taskId, shortId: existing.shortId, title: existing.title },
        board: { id: boardId, name: existing.column.board.name },
        workspace: { slug: existing.column.board.workspace.slug, name: existing.column.board.workspace.name },
        assignedBy,
      });
    }

    return { success: true, data: task };
  }

  private async buildUpdateActivities(
    existing: { priority: string; assignee_id: string | null; due_date: Date | null },
    dto: UpdateTaskDto,
  ): Promise<{ type: "PRIORITY_CHANGED" | "ASSIGNEE_CHANGED" | "DUE_DATE_CHANGED"; metadata: Record<string, unknown> }[]> {
    const activities: { type: "PRIORITY_CHANGED" | "ASSIGNEE_CHANGED" | "DUE_DATE_CHANGED"; metadata: Record<string, unknown> }[] = [];

    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      activities.push({ type: "PRIORITY_CHANGED", metadata: { from: existing.priority, to: dto.priority } });
    }

    if (dto.assignee_id !== undefined && dto.assignee_id !== existing.assignee_id) {
      const userIds = [existing.assignee_id, dto.assignee_id].filter((id): id is string => !!id);
      const users = userIds.length
        ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstname: true, lastname: true } })
        : [];
      const nameOf = (id: string | null) => {
        if (!id) return null;
        const u = users.find((u) => u.id === id);
        return u ? `${u.firstname} ${u.lastname}` : null;
      };
      activities.push({
        type: "ASSIGNEE_CHANGED",
        metadata: {
          fromUserId: existing.assignee_id,
          fromUserName: nameOf(existing.assignee_id),
          toUserId: dto.assignee_id,
          toUserName: nameOf(dto.assignee_id),
        },
      });
    }

    const newDueDate = dto.due_date !== undefined ? (dto.due_date ? new Date(dto.due_date) : null) : undefined;
    if (newDueDate !== undefined && newDueDate?.getTime() !== existing.due_date?.getTime()) {
      activities.push({
        type: "DUE_DATE_CHANGED",
        metadata: { from: existing.due_date?.toISOString() ?? null, to: newDueDate?.toISOString() ?? null },
      });
    }

    return activities;
  }

  async moveTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    dto: MoveTaskDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { id: boardId, workspace_id: workspaceId } } },
      select: { column_id: true, in_progress_at: true, completed_at: true },
    });

    if (!task) throw new NotFoundException("Task not found");

    const fromColumnId = task.column_id;

    const columns = await this.prisma.boardColumn.findMany({
      where: { id: { in: [fromColumnId, dto.column_id] }, board_id: boardId },
      select: { id: true, name: true, type: true },
    });

    const targetColumn = columns.find((c) => c.id === dto.column_id);
    if (!targetColumn) {
      throw new NotFoundException("Target column not found on this board");
    }
    const sourceColumn = columns.find((c) => c.id === fromColumnId);

    let in_progress_at = task.in_progress_at;
    let completed_at = task.completed_at;

    if (targetColumn.type === "ONGOING" && !in_progress_at) {
      in_progress_at = new Date();
    }
    if (targetColumn.type === "COMPLETE") {
      completed_at = new Date();
    }
    if (
      sourceColumn?.type === "COMPLETE" &&
      (targetColumn.type === "ONGOING" || targetColumn.type === "UPCOMING")
    ) {
      completed_at = null;
    }

    const lockKey = `lock:column:${dto.column_id}:position`;
    const acquired = await this.cache.acquireLock(lockKey, 5);
    if (!acquired) {
      throw new ConflictException("This column is busy, please try again");
    }

    try {
      const tasksInTarget = await this.prisma.task.findMany({
        where: { column_id: dto.column_id, is_deleted: false, is_archived: false },
        orderBy: { position: "asc" },
        select: { id: true },
      });

      const filtered = tasksInTarget.filter((t) => t.id !== taskId);
      filtered.splice(dto.position, 0, { id: taskId });

      const columnChanged = fromColumnId !== dto.column_id;

      const [, activity] = await this.prisma.$transaction([
        this.prisma.task.update({
          where: { id: taskId },
          data: {
            column_id: dto.column_id,
            in_progress_at,
            completed_at,
          },
        }),
        ...(columnChanged
          ? [
              this.prisma.taskActivity.create({
                data: {
                  task_id: taskId,
                  actor_id: userId,
                  type: "COLUMN_MOVED",
                  metadata: {
                    fromColumnId,
                    fromColumnName: sourceColumn?.name ?? null,
                    toColumnId: dto.column_id,
                    toColumnName: targetColumn.name,
                  },
                },
                include: { actor: { select: ACTIVITY_ACTOR_SELECT } },
              }),
            ]
          : []),
        ...filtered.map((t, index) =>
          this.prisma.task.update({
            where: { id: t.id },
            data: { position: (index + 1) * POSITION_GAP },
          }),
        ),
      ]);

      await Promise.all([
        this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId)),
        this.cache.invalidatePattern(CacheKeys.workspaceHomePattern(workspaceId)),
      ]);

      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("board:task:moved", {
          boardId,
          taskId,
          fromColumnId,
          toColumnId: dto.column_id,
          position: dto.position,
          userId,
        });

      if (columnChanged && activity) {
        this.statusGateway.server
          .to(`workspace_${workspaceId}`)
          .emit("task:activity:created", { boardId, taskId, activities: [activity] });
      }

      return { success: true };
    } finally {
      await this.cache.releaseLock(lockKey);
    }
  }

  async getWorkspaceModules(workspaceId: string, userId: string) {
    const modules = await this.prisma.workspaceModule.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { position: "asc" },
      include: {
        pinned_by_users: {
          where: { user_id: userId },
          select: { id: true },
        },
      },
    });

    const chatModules = modules.filter(
      (m) => m.type === ModuleTypeEnum.CHAT && m.reference_id,
    );

    if (chatModules.length === 0) {
      return {
        success: true,
        data: modules.map(({ pinned_by_users, ...m }) => ({
          ...m,
          isPinned: pinned_by_users.length > 0,
        })),
      };
    }

    const roomIds = chatModules.map((m) => m.reference_id);

    const receipts = await this.prisma.chatReadReceipt.findMany({
      where: { room_id: { in: roomIds }, user_id: userId },
      select: { room_id: true, last_read_at: true },
    });

    const receiptMap = new Map(receipts.map((r) => [r.room_id, r.last_read_at]));

    const unreadPerRoom = await Promise.all(
      roomIds.map(async (roomId) => {
        const lastReadAt = receiptMap.get(roomId);
        const count = await this.prisma.chatMessage.count({
          where: {
            room_id: roomId,
            ...(lastReadAt ? { created_at: { gt: lastReadAt } } : {}),
          },
        });
        return { room_id: roomId, count };
      }),
    );

    const unreadMap = new Map(unreadPerRoom.map((uc) => [uc.room_id, uc.count]));

    const enrichedModules = modules.map(({ pinned_by_users, ...m }) => {
      const isPinned = pinned_by_users.length > 0;
      if (m.type === ModuleTypeEnum.CHAT && m.reference_id) {
        return {
          ...m,
          isPinned,
          unreadCount: unreadMap.get(m.reference_id) || 0,
        };
      }
      return { ...m, isPinned };
    });

    return { success: true, data: enrichedModules };
  }

  async togglePinModule(workspaceId: string, moduleId: string, userId: string, isPinned: boolean) {
    const module_ = await this.prisma.workspaceModule.findFirst({
      where: { id: moduleId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!module_) throw new NotFoundException("Module not found");

    if (isPinned) {
      await this.prisma.userPinnedModule.upsert({
        where: {
          user_id_module_id: {
            user_id: userId,
            module_id: moduleId,
          },
        },
        create: {
          user_id: userId,
          module_id: moduleId,
        },
        update: {},
      });
    } else {
      await this.prisma.userPinnedModule.deleteMany({
        where: {
          user_id: userId,
          module_id: moduleId,
        },
      });
    }

    return { success: true };
  }

  async reorderModules(workspaceId: string, dto: ReorderModulesDto) {
    const ids = dto.updates.map((u) => u.id);
    const count = await this.prisma.workspaceModule.count({
      where: { id: { in: ids }, workspace_id: workspaceId },
    });
    if (count !== ids.length) {
      throw new NotFoundException("One or more modules not found in this workspace");
    }

    const projectIds = Array.from(
      new Set(
        dto.updates
          .map((u) => u.project_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (projectIds.length > 0) {
      const validProjects = await this.prisma.workspaceProject.findMany({
        where: { id: { in: projectIds }, workspace_id: workspaceId },
        select: { id: true },
      });
      if (validProjects.length !== projectIds.length) {
        throw new ForbiddenException("One or more projects do not belong to this workspace");
      }
    }

    await this.prisma.$transaction(
      dto.updates.map((update) =>
        this.prisma.workspaceModule.update({
          where: { id: update.id },
          data: {
            position: update.position * POSITION_GAP,
            project_id: update.project_id || null,
          },
        }),
      ),
    );


    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:reordered", { updates: dto.updates });

    return { success: true };
  }

  async updateModule(
    workspaceId: string,
    moduleId: string,
    dto: UpdateModuleDto,
  ) {
    const existing = await this.prisma.workspaceModule.findFirst({
      where: { id: moduleId, workspace_id: workspaceId },
      select: { id: true, name: true, type: true, reference_id: true, color: true },
    });
    if (!existing) throw new NotFoundException("Module not found");

    const updateData: { name?: string; color?: string | null } = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.color !== undefined) updateData.color = dto.color;

    const wsModule = await this.prisma.workspaceModule.update({
      where: { id: moduleId },
      data: updateData,
    });

    if (dto.name && wsModule.type === ModuleTypeEnum.BOARD && wsModule.reference_id) {
      await this.prisma.board.update({
        where: { id: wsModule.reference_id },
        data: { name: dto.name },
      });

      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("board:updated", { boardId: wsModule.reference_id, data: { name: dto.name } });
    }

    if (dto.name && wsModule.type === ModuleTypeEnum.CHAT && wsModule.reference_id) {
      await this.prisma.chatRoom.update({
        where: { id: wsModule.reference_id },
        data: { name: dto.name },
      });
    }

    if (dto.name && wsModule.type === ModuleTypeEnum.FILES && wsModule.reference_id) {
      await this.prisma.fileRoom.update({
        where: { id: wsModule.reference_id },
        data: { name: dto.name },
      });
    }

    if (dto.name && wsModule.type === ModuleTypeEnum.BOARD) {
      await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));
    }

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:updated", { moduleId, data: { name: wsModule.name, color: wsModule.color } });

    return { success: true, data: wsModule };
  }

  async searchTasks(workspaceId: string, query: string) {
    const boards = await this.prisma.board.findMany({
      where: { workspace_id: workspaceId },
      select: { id: true },
    });

    const boardIds = boards.map((b) => b.id);

    const tasks = await this.prisma.task.findMany({
      where: {
        column: { board_id: { in: boardIds } },
        is_deleted: false,
        is_archived: false,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { shortId: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        priority: true,
        column: { select: { board_id: true } },
      },
      take: 10,
      orderBy: { created_at: "desc" },
    });

    return {
      success: true,
      data: tasks.map((t) => ({
        id: t.id,
        shortId: t.shortId,
        title: t.title,
        priority: t.priority,
        boardId: t.column.board_id,
      })),
    };
  }

  async deleteModule(workspaceId: string, moduleId: string) {
    const wsModule = await this.prisma.workspaceModule.findFirst({
      where: { id: moduleId, workspace_id: workspaceId },
    });

    if (!wsModule) throw new NotFoundException("Module not found");

    if (wsModule.type === ModuleTypeEnum.BOARD && wsModule.reference_id) {
      await this.deleteBoard(workspaceId, wsModule.reference_id);
    } else if (wsModule.type === ModuleTypeEnum.CHAT && wsModule.reference_id) {
      await this.prisma.$transaction(async (tx) => {
        await tx.chatMessage.deleteMany({ where: { room_id: wsModule.reference_id } });
        await tx.chatRoom.delete({ where: { id: wsModule.reference_id } });
        await tx.workspaceModule.delete({ where: { id: moduleId } });
      });

      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("module:deleted", { moduleId });
    } else if (wsModule.type === ModuleTypeEnum.FILES && wsModule.reference_id) {
      await this.prisma.$transaction(async (tx) => {
        await tx.workspaceFile.deleteMany({ where: { file_room_id: wsModule.reference_id } });
        await tx.fileRoom.delete({ where: { id: wsModule.reference_id } });
        await tx.workspaceModule.delete({ where: { id: moduleId } });
      });

      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("module:deleted", { moduleId });
    } else {
      await this.prisma.workspaceModule.delete({
        where: { id: moduleId },
      });

      this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("module:deleted", { moduleId });
    }

    return { success: true };
  }

  async createProject(workspaceId: string, dto: CreateProjectDto) {
    const lastProject = await this.prisma.workspaceProject.findFirst({
      where: { workspace_id: workspaceId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (lastProject?.position ?? 0) + POSITION_GAP;

    const project = await this.prisma.workspaceProject.create({
      data: {
        workspace_id: workspaceId,
        name: dto.name,
        position: nextPosition,
        color: dto.color ?? null,
      },
    });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("project:created", project);

    return { success: true, data: project };
  }

  async getWorkspaceProjects(workspaceId: string) {
    const projects = await this.prisma.workspaceProject.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { position: "asc" },
    });

    return { success: true, data: projects };
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    const existing = await this.prisma.workspaceProject.findFirst({
      where: { id: projectId, workspace_id: workspaceId },
      select: { id: true, color: true },
    });
    if (!existing) throw new NotFoundException("Project not found");

    const updateData: { name?: string; position?: number; color?: string | null } = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.color !== undefined) updateData.color = dto.color;

    const project = await this.prisma.workspaceProject.update({
      where: { id: projectId },
      data: updateData,
    });

    if (dto.apply_to_modules) {
      const targetColor = dto.color !== undefined ? dto.color : existing.color;
      await this.prisma.workspaceModule.updateMany({
        where: { project_id: projectId, workspace_id: workspaceId },
        data: { color: targetColor },
      });

      const updatedModules = await this.prisma.workspaceModule.findMany({
        where: { project_id: projectId, workspace_id: workspaceId },
        select: { id: true, color: true },
      });

      for (const mod of updatedModules) {
        this.statusGateway.server
          .to(`workspace_${workspaceId}`)
          .emit("module:updated", { moduleId: mod.id, data: { color: mod.color } });
      }
    }

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("project:updated", { projectId, data: updateData });

    return { success: true, data: project };
  }

  async deleteProject(workspaceId: string, projectId: string) {
    const existing = await this.prisma.workspaceProject.findFirst({
      where: { id: projectId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Project not found");

    const modulesInProject = await this.prisma.workspaceModule.findMany({
      where: { project_id: projectId },
      select: { id: true },
    });

    await Promise.all(modulesInProject.map((mod) => this.deleteModule(workspaceId, mod.id)));

    await this.prisma.workspaceProject.delete({
      where: { id: projectId },
    });

    await this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId));

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("project:deleted", { projectId });

    return { success: true };
  }

  async getSchedules(workspaceId: string, userId: string, query: GetSchedulesQueryDto = {}) {
    const where: Prisma.TaskWhereInput = {
      workspace_id: workspaceId,
      is_deleted: false,
      is_archived: false,
    };

    if (query.scope === "created_by_me") {
      where.created_by = userId;
    } else if (query.scope === "all") {
    } else {
      where.assignee_id = userId;
    }

    if (query.boardId) {
      where.column = {
        ...(where.column as Prisma.BoardColumnWhereInput || {}),
        board_id: query.boardId,
      };
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (!query.includeCompleted) {
      where.column = {
        ...(where.column as Prisma.BoardColumnWhereInput || {}),
        type: { not: "COMPLETE" },
      };
    }

    if (query.from || query.to) {
      const dueDateFilter: Prisma.DateTimeNullableFilter = {};
      if (query.from) dueDateFilter.gte = new Date(query.from);
      if (query.to) dueDateFilter.lte = new Date(query.to);
      where.due_date = dueDateFilter;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        id: true,
        shortId: true,
        column_id: true,
        title: true,
        description: true,
        priority: true,
        labels: true,
        tags: true,
        assignee_id: true,
        due_date: true,
        position: true,
        is_deleted: true,
        is_archived: true,
        in_progress_at: true,
        completed_at: true,
        created_by: true,
        created_at: true,
        updated_at: true,
        column: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            board_id: true,
            board: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar_key: true,
          },
        },
        _count: {
          select: {
            comments: true,
            checklistItems: true,
          },
        },
      },
      orderBy: [
        { due_date: "asc" },
        { priority: "desc" },
      ],
    });

    const formattedTasks = tasks.map((t) => ({ ...t, board: t.column.board }));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    let overdue = 0;
    let today = 0;
    let thisWeek = 0;
    let completedThisWeek = 0;

    for (const task of formattedTasks) {
      if (task.column?.type === "COMPLETE" || task.completed_at) {
        if (task.completed_at && new Date(task.completed_at) >= startOfWeek && new Date(task.completed_at) < endOfWeek) {
          completedThisWeek++;
        }
        continue;
      }

      if (task.due_date) {
        const d = new Date(task.due_date);
        if (d < startOfToday) {
          overdue++;
        } else if (d.toDateString() === startOfToday.toDateString()) {
          today++;
        } else if (d < endOfWeek) {
          thisWeek++;
        }
      }
    }

    return {
      success: true,
      data: {
        tasks: formattedTasks,
        counts: {
          overdue,
          today,
          thisWeek,
          completedThisWeek,
          total: formattedTasks.length,
        },
      },
    };
  }
}

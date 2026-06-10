import { Injectable, NotFoundException } from "@nestjs/common";
import { ModuleTypeEnum } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
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
} from "src/board/dto/board.dto";

const POSITION_GAP = 1000;

@Injectable()
export class BoardService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private statusGateway: StatusGateway,
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

  async getBoard(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
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

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:updated", { boardId, data: dto });

    return { success: true, data: board };
  }

  async deleteBoard(workspaceId: string, boardId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.board.delete({ where: { id: boardId } });
      await tx.workspaceModule.deleteMany({
        where: { workspace_id: workspaceId, reference_id: boardId },
      });
    });

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
    const column = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: dto,
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:column:updated", { boardId, columnId, data: dto });

    return { success: true, data: column };
  }

  async deleteColumn(workspaceId: string, boardId: string, columnId: string) {
    await this.prisma.boardColumn.delete({ where: { id: columnId } });

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

    const targetColumn = await this.prisma.boardColumn.findUnique({
      where: { id: dto.column_id },
      select: { type: true },
    });

    const in_progress_at = targetColumn?.type === "ONGOING" ? new Date() : null;
    const completed_at = targetColumn?.type === "COMPLETE" ? new Date() : null;

    const task = await this.prisma.task.create({
      data: {
        column_id: dto.column_id,
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

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:created", { boardId, task });

    return { success: true, data: task };
  }

  async updateTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
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

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data,
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:updated", { boardId, taskId, data: dto });

    return { success: true, data: task };
  }

  async moveTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    dto: MoveTaskDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { column_id: true, in_progress_at: true, completed_at: true },
    });

    if (!task) throw new NotFoundException("Task not found");

    const fromColumnId = task.column_id;

    // Fetch column types to handle transitions
    const columns = await this.prisma.boardColumn.findMany({
      where: { id: { in: [fromColumnId, dto.column_id] } },
      select: { id: true, type: true },
    });

    const sourceColumn = columns.find((c) => c.id === fromColumnId);
    const targetColumn = columns.find((c) => c.id === dto.column_id);

    let in_progress_at = task.in_progress_at;
    let completed_at = task.completed_at;

    if (targetColumn) {
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
    }

    const tasksInTarget = await this.prisma.task.findMany({
      where: { column_id: dto.column_id, is_deleted: false, is_archived: false },
      orderBy: { position: "asc" },
      select: { id: true },
    });

    const filtered = tasksInTarget.filter((t) => t.id !== taskId);
    filtered.splice(dto.position, 0, { id: taskId });

    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: {
          column_id: dto.column_id,
          in_progress_at,
          completed_at,
        },
      }),
      ...filtered.map((t, index) =>
        this.prisma.task.update({
          where: { id: t.id },
          data: { position: (index + 1) * POSITION_GAP },
        }),
      ),
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

    return { success: true };
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
        }))
      };
    }

    const roomIds = chatModules.map((m) => m.reference_id);

    const unreadCounts = await Promise.all(
      roomIds.map(async (roomId) => {
        const receipt = await this.prisma.chatReadReceipt.findFirst({
          where: {
            room_id: roomId,
            user_id: userId,
          },
        });

        const count = await this.prisma.chatMessage.count({
          where: {
            room_id: roomId,
            ...(receipt ? { created_at: { gt: receipt.last_read_at } } : {}),
          },
        });

        return { room_id: roomId, count };
      }),
    );

    const unreadMap = new Map(
      unreadCounts.map((uc) => [uc.room_id, Number(uc.count)]),
    );

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
    const wsModule = await this.prisma.workspaceModule.update({
      where: { id: moduleId },
      data: { name: dto.name },
    });

    if (wsModule.type === ModuleTypeEnum.BOARD && wsModule.reference_id) {
      await this.prisma.board.update({
        where: { id: wsModule.reference_id },
        data: { name: dto.name },
      });
      
       this.statusGateway.server
        .to(`workspace_${workspaceId}`)
        .emit("board:updated", { boardId: wsModule.reference_id, data: { name: dto.name } });
    }

    if (wsModule.type === ModuleTypeEnum.CHAT && wsModule.reference_id) {
      await this.prisma.chatRoom.update({
        where: { id: wsModule.reference_id },
        data: { name: dto.name },
      });
    }

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:updated", { moduleId, data: dto });

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
    const wsModule = await this.prisma.workspaceModule.findUnique({
      where: { id: moduleId },
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

  async createProject(workspaceId: string, dto: { name: string }) {
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
      },
    });

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
    dto: { name?: string; position?: number },
  ) {
    const project = await this.prisma.workspaceProject.update({
      where: { id: projectId },
      data: dto,
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("project:updated", { projectId, data: dto });

    return { success: true, data: project };
  }

  async deleteProject(workspaceId: string, projectId: string) {
    const modulesInProject = await this.prisma.workspaceModule.findMany({
      where: { project_id: projectId },
      select: { id: true },
    });

    for (const mod of modulesInProject) {
      await this.deleteModule(workspaceId, mod.id);
    }

    await this.prisma.workspaceProject.delete({
      where: { id: projectId },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("project:deleted", { projectId });

    return { success: true };
  }
}

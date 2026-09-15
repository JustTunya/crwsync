import { BoardService } from "./board.service";
import { NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { NotificationService } from "src/notification/notification.service";
import {
  UpdateBoardDto,
  CreateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
  ReorderColumnsDto,
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  UpdateModuleDto,
  ReorderModulesDto,
} from "src/board/dto/board.dto";

function makeService() {
  const prisma = {
    board: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    boardColumn: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    taskActivity: { create: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    workspace: { update: jest.fn() },
    workspaceModule: {
      count: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    workspaceProject: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    userPinnedModule: { upsert: jest.fn(), deleteMany: jest.fn() },
    chatReadReceipt: { findMany: jest.fn().mockResolvedValue([]) },
    chatMessage: { count: jest.fn().mockResolvedValue(0), deleteMany: jest.fn() },
    chatRoom: { update: jest.fn(), delete: jest.fn() },
    fileRoom: { update: jest.fn(), delete: jest.fn() },
    workspaceFile: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation((arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
  );

  const cache = { acquireLock: jest.fn().mockResolvedValue(true), releaseLock: jest.fn() };
  const statusGateway = { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } };
  const notificationService = { create: jest.fn() };
  return {
    service: new BoardService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      statusGateway as unknown as StatusGateway,
      notificationService as unknown as NotificationService,
    ),
    prisma,
    cache,
    statusGateway,
    notificationService,
  };
}

describe("BoardService cross-workspace scoping", () => {
  it("getBoard scopes the lookup by workspace_id", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue({ id: "board-1", columns: [] });

    await service.getBoard("ws-1", "board-1");

    expect(prisma.board.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "board-1", workspace_id: "ws-1" } }),
    );
  });

  it("getBoard throws NotFoundException when the board belongs to another workspace", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(service.getBoard("ws-1", "board-from-ws-2")).rejects.toThrow(NotFoundException);
  });

  it("updateBoard rejects a board that doesn't belong to the given workspace", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(
      service.updateBoard("ws-1", "board-from-ws-2", { name: "x" } as unknown as UpdateBoardDto),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.board.update).not.toHaveBeenCalled();
  });

  it("updateBoard updates board, syncs module name when name is provided, and emits event", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.board.findFirst.mockResolvedValue({ id: "board-1" });
    prisma.board.update.mockResolvedValue({ id: "board-1", name: "New Name" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.updateBoard("ws-1", "board-1", { name: "New Name" } as UpdateBoardDto);

    expect(result).toEqual({ success: true, data: { id: "board-1", name: "New Name" } });
    expect(prisma.workspaceModule.updateMany).toHaveBeenCalledWith({
      where: { workspace_id: "ws-1", reference_id: "board-1" },
      data: { name: "New Name" },
    });
    expect(emit).toHaveBeenCalledWith("board:updated", { boardId: "board-1", data: { name: "New Name" } });
  });

  it("updateBoard does not update module name when name is omitted in dto", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue({ id: "board-1" });
    prisma.board.update.mockResolvedValue({ id: "board-1", description: "Updated desc" });

    await service.updateBoard("ws-1", "board-1", { description: "Updated desc" } as UpdateBoardDto);

    expect(prisma.workspaceModule.updateMany).not.toHaveBeenCalled();
  });

  it("createTask rejects a column that doesn't belong to the given board/workspace", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue(null);

    await expect(
      service.createTask(
        "ws-1",
        "board-1",
        { column_id: "col-from-other-board", title: "t" } as unknown as CreateTaskDto,
        "user-1",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("moveTask rejects a target column outside the given board", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([{ id: "col-1", type: "UPCOMING" }]);

    await expect(
      service.moveTask(
        "ws-1",
        "board-1",
        "task-1",
        { column_id: "col-from-other-board", position: 0 } as unknown as MoveTaskDto,
        "user-1",
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("BoardService module/project workspace scoping", () => {
  it("updateModule rejects a module from another workspace", async () => {
    const { service, prisma } = makeService();
    const workspaceModule = { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() };
    (prisma as unknown as { workspaceModule: typeof workspaceModule }).workspaceModule = workspaceModule;

    await expect(
      service.updateModule("ws-1", "module-from-ws-2", { name: "x" } as unknown as UpdateModuleDto),
    ).rejects.toThrow(NotFoundException);
    expect(workspaceModule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "module-from-ws-2", workspace_id: "ws-1" } }),
    );
    expect(workspaceModule.update).not.toHaveBeenCalled();
  });

  it("deleteModule rejects a module from another workspace", async () => {
    const { service, prisma } = makeService();
    const workspaceModule = { findFirst: jest.fn().mockResolvedValue(null) };
    (prisma as unknown as { workspaceModule: typeof workspaceModule }).workspaceModule = workspaceModule;

    await expect(service.deleteModule("ws-1", "module-from-ws-2")).rejects.toThrow(NotFoundException);
    expect(workspaceModule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "module-from-ws-2", workspace_id: "ws-1" } }),
    );
  });

  it("reorderModules rejects updates when project_id belongs to another workspace", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.count.mockResolvedValue(1); // module exists in workspace
    prisma.workspaceProject.findMany.mockResolvedValue([]); // project NOT in this workspace

    const dto: ReorderModulesDto = {
      updates: [{ id: "mod-1", position: 1, project_id: "project-from-other-ws" }],
    };

    await expect(service.reorderModules("ws-1", dto)).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.workspaceModule.update).not.toHaveBeenCalled();
  });

  it("reorderModules succeeds when project_id belongs to the workspace", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.count.mockResolvedValue(1);
    prisma.workspaceProject.findMany.mockResolvedValue([{ id: "project-1" }]);

    const dto: ReorderModulesDto = {
      updates: [{ id: "mod-1", position: 1, project_id: "project-1" }],
    };

    const result = await service.reorderModules("ws-1", dto);
    expect(result).toEqual({ success: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("BoardService updateTask assignee notifications", () => {
  const existingTask = {
    priority: "NONE",
    assignee_id: null as string | null,
    due_date: null,
    shortId: "CRW-1",
    title: "Ship it",
    column: { board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } } },
  };

  it("notifies the newly assigned user", async () => {
    const { service, prisma, notificationService } = makeService();
    prisma.task.findFirst.mockResolvedValue(existingTask);
    prisma.task.update.mockResolvedValue({ id: "task-1" });
    prisma.user.findUnique.mockResolvedValue({ id: "actor-1", firstname: "A", lastname: "B", avatar_key: null });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      { assignee_id: "user-2" } as unknown as UpdateTaskDto,
      "actor-1",
    );

    expect(notificationService.create).toHaveBeenCalledWith(
      "user-2",
      "ws-1",
      "TASK_ASSIGNED",
      expect.objectContaining({
        task: { id: "task-1", shortId: "CRW-1", title: "Ship it" },
        board: { id: "board-1", name: "Main board" },
        workspace: { slug: "acme", name: "Acme" },
      }),
    );
  });

  it("does not notify when the actor assigns the task to themselves", async () => {
    const { service, prisma, notificationService } = makeService();
    prisma.task.findFirst.mockResolvedValue(existingTask);
    prisma.task.update.mockResolvedValue({ id: "task-1" });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      { assignee_id: "actor-1" } as unknown as UpdateTaskDto,
      "actor-1",
    );

    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it("does not notify when the task is unassigned", async () => {
    const { service, prisma, notificationService } = makeService();
    prisma.task.findFirst.mockResolvedValue({ ...existingTask, assignee_id: "user-2" });
    prisma.task.update.mockResolvedValue({ id: "task-1" });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      { assignee_id: null } as unknown as UpdateTaskDto,
      "actor-1",
    );

    expect(notificationService.create).not.toHaveBeenCalled();
  });
});

describe("BoardService createBoard", () => {
  it("creates a board and workspace module, emits module:created", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ position: 2000 });
    prisma.board.create.mockResolvedValue({ id: "board-1", name: "Board" });
    prisma.workspaceModule.create.mockResolvedValue({ id: "module-1", reference_id: "board-1" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.createBoard("ws-1", "user-1", { name: "Board" } as CreateBoardDto);

    expect(result).toEqual({ success: true, data: { id: "board-1", name: "Board" } });
    expect(prisma.workspaceModule.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3000, workspace_id: "ws-1" }) }),
    );
    expect(emit).toHaveBeenCalledWith("module:created", { id: "module-1", reference_id: "board-1" });
  });

  it("defaults position to POSITION_GAP when no prior module exists", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue(null);
    prisma.board.create.mockResolvedValue({ id: "board-1" });
    prisma.workspaceModule.create.mockResolvedValue({ id: "module-1" });

    await service.createBoard("ws-1", "user-1", { name: "Board" } as CreateBoardDto);

    expect(prisma.workspaceModule.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 1000 }) }),
    );
  });
});

describe("BoardService getBoards", () => {
  it("returns boards for the workspace", async () => {
    const { service, prisma } = makeService();
    prisma.board.findMany.mockResolvedValue([{ id: "board-1" }]);

    const result = await service.getBoards("ws-1");

    expect(result).toEqual({ success: true, data: [{ id: "board-1" }] });
    expect(prisma.board.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspace_id: "ws-1" } }),
    );
  });
});

describe("BoardService deleteBoard", () => {
  it("throws when board not found", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(service.deleteBoard("ws-1", "board-1")).rejects.toThrow(NotFoundException);
  });

  it("deletes the board and its module, emitting both events", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.board.findFirst.mockResolvedValue({ id: "board-1" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.deleteBoard("ws-1", "board-1");

    expect(result).toEqual({ success: true });
    expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: "board-1" } });
    expect(prisma.workspaceModule.deleteMany).toHaveBeenCalledWith({
      where: { workspace_id: "ws-1", reference_id: "board-1" },
    });
    expect(emit).toHaveBeenCalledWith("module:deleted", { referenceId: "board-1" });
    expect(emit).toHaveBeenCalledWith("board:deleted", { boardId: "board-1" });
  });
});

describe("BoardService createColumn", () => {
  it("throws when board not found", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(
      service.createColumn("ws-1", "board-1", { name: "To do" } as CreateColumnDto),
    ).rejects.toThrow(NotFoundException);
  });

  it("creates a column positioned after the last one", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue({ id: "board-1" });
    prisma.boardColumn.findFirst.mockResolvedValue({ position: 2000 });
    prisma.boardColumn.create.mockResolvedValue({ id: "col-1", position: 3000 });

    const result = await service.createColumn("ws-1", "board-1", { name: "To do" } as CreateColumnDto);

    expect(result).toEqual({ success: true, data: { id: "col-1", position: 3000 } });
    expect(prisma.boardColumn.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3000, board_id: "board-1" }) }),
    );
  });
});

describe("BoardService updateColumn", () => {
  it("throws when column not found on this board", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue(null);

    await expect(
      service.updateColumn("ws-1", "board-1", "col-1", { name: "x" } as UpdateColumnDto),
    ).rejects.toThrow(NotFoundException);
  });

  it("updates the column and emits board:column:updated", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue({ id: "col-1" });
    prisma.boardColumn.update.mockResolvedValue({ id: "col-1", name: "Done" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.updateColumn("ws-1", "board-1", "col-1", { name: "Done" } as UpdateColumnDto);

    expect(result).toEqual({ success: true, data: { id: "col-1", name: "Done" } });
    expect(emit).toHaveBeenCalledWith("board:column:updated", {
      boardId: "board-1",
      columnId: "col-1",
      data: { name: "Done" },
    });
  });
});

describe("BoardService deleteColumn", () => {
  it("throws when column not found on this board", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue(null);

    await expect(service.deleteColumn("ws-1", "board-1", "col-1")).rejects.toThrow(NotFoundException);
  });

  it("deletes the column and emits board:column:deleted", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue({ id: "col-1" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.deleteColumn("ws-1", "board-1", "col-1");

    expect(result).toEqual({ success: true });
    expect(prisma.boardColumn.delete).toHaveBeenCalledWith({ where: { id: "col-1" } });
    expect(emit).toHaveBeenCalledWith("board:column:deleted", { boardId: "board-1", columnId: "col-1" });
  });
});

describe("BoardService reorderColumns", () => {
  it("throws when one or more columns are not found on the board", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.count.mockResolvedValue(1);

    await expect(
      service.reorderColumns("ws-1", "board-1", { column_ids: ["a", "b"] } as ReorderColumnsDto),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reorders columns by position and emits board:columns:reordered", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.boardColumn.count.mockResolvedValue(2);
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.reorderColumns("ws-1", "board-1", { column_ids: ["a", "b"] } as ReorderColumnsDto);

    expect(result).toEqual({ success: true });
    expect(prisma.boardColumn.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { position: 1000 } });
    expect(prisma.boardColumn.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { position: 2000 } });
    expect(emit).toHaveBeenCalledWith("board:columns:reordered", { boardId: "board-1", columnIds: ["a", "b"] });
  });
});

describe("BoardService createTask", () => {
  it("throws ConflictException when the column lock cannot be acquired", async () => {
    const { service, prisma, cache } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue({ type: "UPCOMING" });
    cache.acquireLock.mockResolvedValue(false);

    await expect(
      service.createTask("ws-1", "board-1", { column_id: "col-1", title: "Task" } as CreateTaskDto, "user-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("creates a task with a stamped shortId and releases the lock", async () => {
    const { service, prisma, cache, statusGateway } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue({ type: "ONGOING" });
    prisma.task.findFirst.mockResolvedValue({ position: 1000 });
    prisma.workspace.update.mockResolvedValue({ workspaceKey: "CRW", taskSequenceCounter: 5 });
    prisma.task.create.mockResolvedValue({ id: "task-1", shortId: "CRW-5" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.createTask(
      "ws-1",
      "board-1",
      { column_id: "col-1", title: "Task" } as CreateTaskDto,
      "user-1",
    );

    expect(result).toEqual({ success: true, data: { id: "task-1", shortId: "CRW-5" } });
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shortId: "CRW-5",
          position: 2000,
          in_progress_at: expect.any(Date),
          completed_at: null,
        }),
      }),
    );
    expect(emit).toHaveBeenCalledWith("board:task:created", {
      boardId: "board-1",
      task: { id: "task-1", shortId: "CRW-5" },
    });
    expect(cache.releaseLock).toHaveBeenCalledWith("lock:column:col-1:position");
  });

  it("releases the lock even when task creation fails", async () => {
    const { service, prisma, cache } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue({ type: "UPCOMING" });
    prisma.task.findFirst.mockResolvedValue(null);
    prisma.workspace.update.mockRejectedValue(new Error("db down"));

    await expect(
      service.createTask("ws-1", "board-1", { column_id: "col-1", title: "Task" } as CreateTaskDto, "user-1"),
    ).rejects.toThrow("db down");
    expect(cache.releaseLock).toHaveBeenCalledWith("lock:column:col-1:position");
  });
});

describe("BoardService updateTask activities", () => {
  const existingTask = {
    priority: "NONE",
    assignee_id: null as string | null,
    due_date: null as Date | null,
    shortId: "CRW-1",
    title: "Ship it",
    column: { board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } } },
  };

  it("throws when the task is not found in this board/workspace", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.updateTask("ws-1", "board-1", "task-1", { title: "x" } as UpdateTaskDto, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("records a PRIORITY_CHANGED activity and emits it", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.task.findFirst.mockResolvedValue(existingTask);
    prisma.task.update.mockResolvedValue({ id: "task-1" });
    prisma.taskActivity.create.mockResolvedValue({ id: "activity-1", type: "PRIORITY_CHANGED" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    await service.updateTask("ws-1", "board-1", "task-1", { priority: "HIGH" } as unknown as UpdateTaskDto, "user-1");

    expect(prisma.taskActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PRIORITY_CHANGED", metadata: { from: "NONE", to: "HIGH" } }),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      "task:activity:created",
      expect.objectContaining({ boardId: "board-1", taskId: "task-1" }),
    );
  });

  it("records a DUE_DATE_CHANGED activity when the due date changes", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue(existingTask);
    prisma.task.update.mockResolvedValue({ id: "task-1" });
    prisma.taskActivity.create.mockResolvedValue({ id: "activity-1", type: "DUE_DATE_CHANGED" });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      { due_date: "2026-01-01T00:00:00.000Z" } as unknown as UpdateTaskDto,
      "user-1",
    );

    expect(prisma.taskActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "DUE_DATE_CHANGED" }) }),
    );
  });

  it("does not create or emit an activity when nothing tracked changes", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.task.findFirst.mockResolvedValue(existingTask);
    prisma.task.update.mockResolvedValue({ id: "task-1" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      { title: "New title" } as unknown as UpdateTaskDto,
      "user-1",
    );

    expect(prisma.taskActivity.create).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalledWith("task:activity:created", expect.anything());
  });

  it("updates in_progress_at, completed_at, is_deleted, is_archived and formats dates", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue(existingTask);
    prisma.task.update.mockResolvedValue({ id: "task-1" });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      {
        in_progress_at: "2026-02-01T00:00:00.000Z",
        completed_at: "2026-02-02T00:00:00.000Z",
        is_deleted: true,
        is_archived: true,
        labels: ["bug"],
        tags: ["v1"],
      } as unknown as UpdateTaskDto,
      "user-1",
    );

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: expect.objectContaining({
          in_progress_at: expect.any(Date),
          completed_at: expect.any(Date),
          is_deleted: true,
          is_archived: true,
          labels: ["bug"],
          tags: ["v1"],
        }),
      }),
    );
  });

  it("resolves user names when recording ASSIGNEE_CHANGED activity", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue({ ...existingTask, assignee_id: "user-old" });
    prisma.user.findMany.mockResolvedValue([
      { id: "user-old", firstname: "Old", lastname: "Dev" },
      { id: "user-new", firstname: "New", lastname: "Dev" },
    ]);
    prisma.task.update.mockResolvedValue({ id: "task-1" });

    await service.updateTask(
      "ws-1",
      "board-1",
      "task-1",
      { assignee_id: "user-new" } as unknown as UpdateTaskDto,
      "actor-1",
    );

    expect(prisma.taskActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "ASSIGNEE_CHANGED",
          metadata: expect.objectContaining({
            fromUserId: "user-old",
            fromUserName: "Old Dev",
            toUserId: "user-new",
            toUserName: "New Dev",
          }),
        }),
      }),
    );
  });
});

describe("BoardService moveTask", () => {
  it("throws when the task is not found", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-2", position: 0 } as MoveTaskDto, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ConflictException when the target column lock cannot be acquired", async () => {
    const { service, prisma, cache } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([
      { id: "col-1", name: "To do", type: "UPCOMING" },
      { id: "col-2", name: "Doing", type: "ONGOING" },
    ]);
    cache.acquireLock.mockResolvedValue(false);

    await expect(
      service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-2", position: 0 } as MoveTaskDto, "user-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("moves within the same column without recording a COLUMN_MOVED activity", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([{ id: "col-1", name: "To do", type: "UPCOMING" }]);
    prisma.task.findMany.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.moveTask(
      "ws-1",
      "board-1",
      "task-1",
      { column_id: "col-1", position: 1 } as MoveTaskDto,
      "user-1",
    );

    expect(result).toEqual({ success: true });
    expect(prisma.taskActivity.create).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalledWith("task:activity:created", expect.anything());
    expect(emit).toHaveBeenCalledWith(
      "board:task:moved",
      expect.objectContaining({ fromColumnId: "col-1", toColumnId: "col-1" }),
    );
  });

  it("stamps in_progress_at moving into an ONGOING column and records COLUMN_MOVED", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([
      { id: "col-1", name: "To do", type: "UPCOMING" },
      { id: "col-2", name: "Doing", type: "ONGOING" },
    ]);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.taskActivity.create.mockResolvedValue({ id: "activity-1", type: "COLUMN_MOVED" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    await service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-2", position: 0 } as MoveTaskDto, "user-1");

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: expect.objectContaining({ column_id: "col-2", in_progress_at: expect.any(Date) }),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      "task:activity:created",
      expect.objectContaining({ boardId: "board-1", taskId: "task-1" }),
    );
  });

  it("clears completed_at when moving out of COMPLETE back into ONGOING", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue({
      column_id: "col-done",
      in_progress_at: new Date("2026-01-01"),
      completed_at: new Date("2026-01-02"),
    });
    prisma.boardColumn.findMany.mockResolvedValue([
      { id: "col-done", name: "Done", type: "COMPLETE" },
      { id: "col-doing", name: "Doing", type: "ONGOING" },
    ]);
    prisma.task.findMany.mockResolvedValue([]);

    await service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-doing", position: 0 } as MoveTaskDto, "user-1");

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completed_at: null }) }),
    );
  });

  it("stamps completed_at when moving into a COMPLETE column", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-doing", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([
      { id: "col-doing", name: "Doing", type: "ONGOING" },
      { id: "col-done", name: "Done", type: "COMPLETE" },
    ]);
    prisma.task.findMany.mockResolvedValue([]);

    await service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-done", position: 0 } as MoveTaskDto, "user-1");

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completed_at: expect.any(Date) }) }),
    );
  });

  it("releases the lock after moving", async () => {
    const { service, prisma, cache } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([{ id: "col-1", name: "To do", type: "UPCOMING" }]);
    prisma.task.findMany.mockResolvedValue([]);

    await service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-1", position: 0 } as MoveTaskDto, "user-1");

    expect(cache.releaseLock).toHaveBeenCalledWith("lock:column:col-1:position");
  });
});

describe("BoardService getWorkspaceModules", () => {
  it("returns modules with an isPinned flag when there are no chat modules", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findMany.mockResolvedValue([
      { id: "mod-1", type: "BOARD", reference_id: "board-1", pinned_by_users: [{ id: "p1" }] },
      { id: "mod-2", type: "BOARD", reference_id: "board-2", pinned_by_users: [] },
    ]);

    const result = await service.getWorkspaceModules("ws-1", "user-1");

    expect(result).toEqual({
      success: true,
      data: [
        { id: "mod-1", type: "BOARD", reference_id: "board-1", isPinned: true },
        { id: "mod-2", type: "BOARD", reference_id: "board-2", isPinned: false },
      ],
    });
  });

  it("enriches CHAT modules with unread counts since the last read receipt", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findMany.mockResolvedValue([
      { id: "mod-1", type: "CHAT", reference_id: "room-1", pinned_by_users: [] },
    ]);
    prisma.chatReadReceipt.findMany.mockResolvedValue([{ room_id: "room-1", last_read_at: new Date("2026-01-01") }]);
    prisma.chatMessage.count.mockResolvedValue(3);

    const result = await service.getWorkspaceModules("ws-1", "user-1");

    expect(result.data[0]).toEqual(expect.objectContaining({ id: "mod-1", isPinned: false, unreadCount: 3 }));
    expect(prisma.chatMessage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ room_id: "room-1", created_at: { gt: expect.any(Date) } }),
      }),
    );
  });

  it("counts all messages when there is no prior read receipt", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findMany.mockResolvedValue([
      { id: "mod-1", type: "CHAT", reference_id: "room-1", pinned_by_users: [] },
      { id: "mod-2", type: "BOARD", reference_id: "board-1", pinned_by_users: [] },
    ]);
    prisma.chatReadReceipt.findMany.mockResolvedValue([]);
    prisma.chatMessage.count.mockResolvedValue(7);

    const result = await service.getWorkspaceModules("ws-1", "user-1");

    expect(result.data[0]).toEqual(expect.objectContaining({ unreadCount: 7 }));
    expect(result.data[1]).toEqual(expect.objectContaining({ id: "mod-2", isPinned: false }));
    expect(prisma.chatMessage.count).toHaveBeenCalledWith({ where: { room_id: "room-1" } });
  });
});

describe("BoardService togglePinModule", () => {
  it("throws when module not found", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue(null);

    await expect(service.togglePinModule("ws-1", "mod-1", "user-1", true)).rejects.toThrow(NotFoundException);
  });

  it("upserts a pin when isPinned is true", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1" });

    const result = await service.togglePinModule("ws-1", "mod-1", "user-1", true);

    expect(result).toEqual({ success: true });
    expect(prisma.userPinnedModule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id_module_id: { user_id: "user-1", module_id: "mod-1" } } }),
    );
  });

  it("removes the pin when isPinned is false", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1" });

    const result = await service.togglePinModule("ws-1", "mod-1", "user-1", false);

    expect(result).toEqual({ success: true });
    expect(prisma.userPinnedModule.deleteMany).toHaveBeenCalledWith({
      where: { user_id: "user-1", module_id: "mod-1" },
    });
  });
});

describe("BoardService reorderModules module lookup", () => {
  it("throws when one or more modules are not found in the workspace", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.count.mockResolvedValue(0);

    await expect(
      service.reorderModules("ws-1", { updates: [{ id: "mod-1", position: 1 }] } as ReorderModulesDto),
    ).rejects.toThrow(NotFoundException);
  });

  it("reorders modules without a project check when no project_id is given", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.count.mockResolvedValue(1);

    const result = await service.reorderModules("ws-1", { updates: [{ id: "mod-1", position: 2 }] } as ReorderModulesDto);

    expect(result).toEqual({ success: true });
    expect(prisma.workspaceProject.findMany).not.toHaveBeenCalled();
    expect(prisma.workspaceModule.update).toHaveBeenCalledWith({
      where: { id: "mod-1" },
      data: { position: 2000, project_id: null },
    });
  });
});

describe("BoardService updateModule cascades", () => {
  it("renames the underlying board when the module type is BOARD", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1" });
    prisma.workspaceModule.update.mockResolvedValue({ id: "mod-1", type: "BOARD", reference_id: "board-1" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.updateModule("ws-1", "mod-1", { name: "New name" } as UpdateModuleDto);

    expect(result).toEqual({ success: true, data: { id: "mod-1", type: "BOARD", reference_id: "board-1" } });
    expect(prisma.board.update).toHaveBeenCalledWith({ where: { id: "board-1" }, data: { name: "New name" } });
    expect(emit).toHaveBeenCalledWith("board:updated", { boardId: "board-1", data: { name: "New name" } });
    expect(emit).toHaveBeenCalledWith("module:updated", expect.objectContaining({ moduleId: "mod-1" }));
  });

  it("renames the underlying chat room when the module type is CHAT", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1" });
    prisma.workspaceModule.update.mockResolvedValue({ id: "mod-1", type: "CHAT", reference_id: "room-1" });

    await service.updateModule("ws-1", "mod-1", { name: "New name" } as UpdateModuleDto);

    expect(prisma.chatRoom.update).toHaveBeenCalledWith({ where: { id: "room-1" }, data: { name: "New name" } });
  });

  it("renames the underlying file room when the module type is FILES", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1" });
    prisma.workspaceModule.update.mockResolvedValue({ id: "mod-1", type: "FILES", reference_id: "files-1" });

    await service.updateModule("ws-1", "mod-1", { name: "New name" } as UpdateModuleDto);

    expect(prisma.fileRoom.update).toHaveBeenCalledWith({ where: { id: "files-1" }, data: { name: "New name" } });
  });

  it("does not touch any other table for an unrecognized module type", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1" });
    prisma.workspaceModule.update.mockResolvedValue({ id: "mod-1", type: "OTHER", reference_id: null });

    await service.updateModule("ws-1", "mod-1", { name: "New name" } as UpdateModuleDto);

    expect(prisma.board.update).not.toHaveBeenCalled();
    expect(prisma.chatRoom.update).not.toHaveBeenCalled();
    expect(prisma.fileRoom.update).not.toHaveBeenCalled();
  });
});

describe("BoardService searchTasks", () => {
  it("maps matching tasks with their board id", async () => {
    const { service, prisma } = makeService();
    prisma.board.findMany.mockResolvedValue([{ id: "board-1" }, { id: "board-2" }]);
    prisma.task.findMany.mockResolvedValue([
      { id: "task-1", shortId: "CRW-1", title: "Fix bug", priority: "HIGH", column: { board_id: "board-1" } },
    ]);

    const result = await service.searchTasks("ws-1", "bug");

    expect(result).toEqual({
      success: true,
      data: [{ id: "task-1", shortId: "CRW-1", title: "Fix bug", priority: "HIGH", boardId: "board-1" }],
    });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ column: { board_id: { in: ["board-1", "board-2"] } } }),
      }),
    );
  });
});

describe("BoardService deleteModule", () => {
  it("throws when module not found", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue(null);

    await expect(service.deleteModule("ws-1", "mod-1")).rejects.toThrow(NotFoundException);
  });

  it("delegates to deleteBoard for BOARD modules", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1", type: "BOARD", reference_id: "board-1" });
    prisma.board.findFirst.mockResolvedValue({ id: "board-1" });

    const result = await service.deleteModule("ws-1", "mod-1");

    expect(result).toEqual({ success: true });
    expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: "board-1" } });
  });

  it("deletes chat messages, room, and module for CHAT modules", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1", type: "CHAT", reference_id: "room-1" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.deleteModule("ws-1", "mod-1");

    expect(result).toEqual({ success: true });
    expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({ where: { room_id: "room-1" } });
    expect(prisma.chatRoom.delete).toHaveBeenCalledWith({ where: { id: "room-1" } });
    expect(prisma.workspaceModule.delete).toHaveBeenCalledWith({ where: { id: "mod-1" } });
    expect(emit).toHaveBeenCalledWith("module:deleted", { moduleId: "mod-1" });
  });

  it("deletes files, file room, and module for FILES modules", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1", type: "FILES", reference_id: "files-1" });

    const result = await service.deleteModule("ws-1", "mod-1");

    expect(result).toEqual({ success: true });
    expect(prisma.workspaceFile.deleteMany).toHaveBeenCalledWith({ where: { file_room_id: "files-1" } });
    expect(prisma.fileRoom.delete).toHaveBeenCalledWith({ where: { id: "files-1" } });
  });

  it("deletes the module directly for any other type", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1", type: "OTHER", reference_id: null });

    const result = await service.deleteModule("ws-1", "mod-1");

    expect(result).toEqual({ success: true });
    expect(prisma.workspaceModule.delete).toHaveBeenCalledWith({ where: { id: "mod-1" } });
  });
});

describe("BoardService project management", () => {
  it("updates module color and emits module:updated with color", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1", name: "Board", type: "BOARD", reference_id: "board-1", color: null });
    prisma.workspaceModule.update.mockResolvedValue({ id: "mod-1", name: "Board", type: "BOARD", reference_id: "board-1", color: "var(--label-blue)" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.updateModule("ws-1", "mod-1", { color: "var(--label-blue)" } as UpdateModuleDto);

    expect(result).toEqual({ success: true, data: expect.objectContaining({ color: "var(--label-blue)" }) });
    expect(prisma.workspaceModule.update).toHaveBeenCalledWith({ where: { id: "mod-1" }, data: { color: "var(--label-blue)" } });
    expect(emit).toHaveBeenCalledWith("module:updated", { moduleId: "mod-1", data: { name: "Board", color: "var(--label-blue)" } });
  });

  it("creates a project with color", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceProject.findFirst.mockResolvedValue({ position: 1000 });
    prisma.workspaceProject.create.mockResolvedValue({ id: "project-1", position: 2000, name: "Q1", color: "var(--label-red)" });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.createProject("ws-1", { name: "Q1", color: "var(--label-red)" });

    expect(result).toEqual({ success: true, data: { id: "project-1", position: 2000, name: "Q1", color: "var(--label-red)" } });
    expect(prisma.workspaceProject.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 2000, name: "Q1", color: "var(--label-red)" }) }),
    );
    expect(emit).toHaveBeenCalledWith("project:created", { id: "project-1", position: 2000, name: "Q1", color: "var(--label-red)" });
  });

  it("updates a project and propagates color to child modules when apply_to_modules is true", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceProject.findFirst.mockResolvedValue({ id: "project-1" });
    prisma.workspaceProject.update.mockResolvedValue({ id: "project-1", color: "var(--label-green)" });
    prisma.workspaceModule.findMany.mockResolvedValue([
      { id: "mod-1", color: "var(--label-green)" },
      { id: "mod-2", color: "var(--label-green)" },
    ]);
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.updateProject("ws-1", "project-1", { color: "var(--label-green)", apply_to_modules: true });

    expect(result).toEqual({ success: true, data: { id: "project-1", color: "var(--label-green)" } });
    expect(prisma.workspaceModule.updateMany).toHaveBeenCalledWith({
      where: { project_id: "project-1", workspace_id: "ws-1" },
      data: { color: "var(--label-green)" },
    });
    expect(emit).toHaveBeenCalledWith("project:updated", { projectId: "project-1", data: { color: "var(--label-green)" } });
    expect(emit).toHaveBeenCalledWith("module:updated", { moduleId: "mod-1", data: { color: "var(--label-green)" } });
    expect(emit).toHaveBeenCalledWith("module:updated", { moduleId: "mod-2", data: { color: "var(--label-green)" } });
  });

  it("returns workspace projects ordered by position", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceProject.findMany.mockResolvedValue([{ id: "project-1" }]);

    const result = await service.getWorkspaceProjects("ws-1");

    expect(result).toEqual({ success: true, data: [{ id: "project-1" }] });
  });

  it("throws when updating a project outside the workspace", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceProject.findFirst.mockResolvedValue(null);

    await expect(service.updateProject("ws-1", "project-from-other-ws", { name: "x" })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("updates a project belonging to the workspace", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceProject.findFirst.mockResolvedValue({ id: "project-1" });
    prisma.workspaceProject.update.mockResolvedValue({ id: "project-1", name: "Renamed" });

    const result = await service.updateProject("ws-1", "project-1", { name: "Renamed" });

    expect(result).toEqual({ success: true, data: { id: "project-1", name: "Renamed" } });
  });

  it("throws when deleting a project outside the workspace", async () => {
    const { service, prisma } = makeService();
    prisma.workspaceProject.findFirst.mockResolvedValue(null);

    await expect(service.deleteProject("ws-1", "project-from-other-ws")).rejects.toThrow(NotFoundException);
  });

  it("cascades module deletion before deleting the project", async () => {
    const { service, prisma, statusGateway } = makeService();
    prisma.workspaceProject.findFirst.mockResolvedValue({ id: "project-1" });
    prisma.workspaceModule.findMany.mockResolvedValue([{ id: "mod-1" }]);
    prisma.workspaceModule.findFirst.mockResolvedValue({ id: "mod-1", type: "OTHER", reference_id: null });
    const emit = jest.fn();
    statusGateway.server.to.mockReturnValue({ emit });

    const result = await service.deleteProject("ws-1", "project-1");

    expect(result).toEqual({ success: true });
    expect(prisma.workspaceModule.delete).toHaveBeenCalledWith({ where: { id: "mod-1" } });
    expect(prisma.workspaceProject.delete).toHaveBeenCalledWith({ where: { id: "project-1" } });
    expect(emit).toHaveBeenCalledWith("project:deleted", { projectId: "project-1" });
  });
});


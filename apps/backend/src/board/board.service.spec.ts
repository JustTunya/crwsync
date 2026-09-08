import { BoardService } from "./board.service";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { UpdateBoardDto, CreateTaskDto, MoveTaskDto, UpdateModuleDto } from "src/board/dto/board.dto";

function makeService() {
  const prisma = {
    board: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    boardColumn: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    task: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    workspace: { update: jest.fn() },
    $transaction: jest.fn((arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)({}),
    ),
  };
  const cache = { acquireLock: jest.fn().mockResolvedValue(true), releaseLock: jest.fn() };
  const statusGateway = { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } };
  return {
    service: new BoardService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      statusGateway as unknown as StatusGateway,
    ),
    prisma,
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
});

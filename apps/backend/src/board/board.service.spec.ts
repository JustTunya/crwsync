import { BoardService } from "./board.service";
import { NotFoundException } from "@nestjs/common";

function makeService() {
  const prisma = {
    board: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    boardColumn: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    task: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    workspace: { update: jest.fn() },
    $transaction: jest.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg({}))),
  } as any;
  const cache = { acquireLock: jest.fn().mockResolvedValue(true), releaseLock: jest.fn() } as any;
  const statusGateway = { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } } as any;
  return { service: new BoardService(prisma, cache, statusGateway), prisma };
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

    await expect(service.updateBoard("ws-1", "board-from-ws-2", { name: "x" } as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.board.update).not.toHaveBeenCalled();
  });

  it("createTask rejects a column that doesn't belong to the given board/workspace", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue(null);

    await expect(
      service.createTask("ws-1", "board-1", { column_id: "col-from-other-board", title: "t" } as any, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("moveTask rejects a target column outside the given board", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([{ id: "col-1", type: "UPCOMING" }]);

    await expect(
      service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-from-other-board", position: 0 } as any, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });
});

import { NotFoundException } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { CreateTaskChecklistItemDto, UpdateTaskChecklistItemDto } from "./dto/task-checklist.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";

describe("WorkspaceService task checklist items", () => {
  let service: WorkspaceService;
  let prisma: {
    task: { findFirst: jest.Mock };
    taskChecklistItem: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };
  let statusGateway: { server: { to: jest.Mock } };
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    statusGateway = { server: { to: jest.fn().mockReturnValue({ emit }) } };
    prisma = {
      task: { findFirst: jest.fn() },
      taskChecklistItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new WorkspaceService(
      prisma as unknown as PrismaService,
      {} as unknown as CacheService,
      statusGateway as unknown as StatusGateway,
      {} as unknown as StorageService,
    );
  });

  describe("createTaskChecklistItem", () => {
    const dto: CreateTaskChecklistItemDto = { content: "Write tests" };

    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskChecklistItem("ws-1", "task-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("positions the item after existing items and emits task:checklist:created", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1" } });
      prisma.taskChecklistItem.count.mockResolvedValue(2);
      const item = { id: "item-1", task_id: "task-1", content: dto.content, position: 2 };
      prisma.taskChecklistItem.create.mockResolvedValue(item);

      const result = await service.createTaskChecklistItem("ws-1", "task-1", "user-1", dto);

      expect(prisma.taskChecklistItem.create).toHaveBeenCalledWith({
        data: { task_id: "task-1", content: dto.content, created_by: "user-1", position: 2 },
      });
      expect(result).toEqual({ success: true, data: item });
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(emit).toHaveBeenCalledWith(
        "task:checklist:created",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", item }),
      );
    });
  });

  describe("updateTaskChecklistItem", () => {
    const dto: UpdateTaskChecklistItemDto = { is_completed: true };

    it("throws NotFoundException when the item does not resolve", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaskChecklistItem("ws-1", "task-1", "item-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("updates the item and emits task:checklist:updated", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue({
        id: "item-1",
        task: { column: { board_id: "board-1" } },
      });
      const updated = { id: "item-1", is_completed: true };
      prisma.taskChecklistItem.update.mockResolvedValue(updated);

      const result = await service.updateTaskChecklistItem("ws-1", "task-1", "item-1", dto);

      expect(prisma.taskChecklistItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { is_completed: true },
      });
      expect(result).toEqual({ success: true, data: updated });
      expect(emit).toHaveBeenCalledWith(
        "task:checklist:updated",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", item: updated }),
      );
    });
  });

  describe("deleteTaskChecklistItem", () => {
    it("throws NotFoundException when the item does not resolve", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTaskChecklistItem("ws-1", "task-1", "item-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("deletes the item and emits task:checklist:deleted", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue({
        id: "item-1",
        task: { column: { board_id: "board-1" } },
      });

      const result = await service.deleteTaskChecklistItem("ws-1", "task-1", "item-1");

      expect(result).toEqual({ success: true });
      expect(prisma.taskChecklistItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
      expect(emit).toHaveBeenCalledWith(
        "task:checklist:deleted",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", itemId: "item-1" }),
      );
    });
  });
});

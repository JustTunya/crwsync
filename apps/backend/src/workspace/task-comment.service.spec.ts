import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { CreateTaskCommentDto, UpdateTaskCommentDto } from "./dto/task-comment.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";

describe("WorkspaceService task comments", () => {
  let service: WorkspaceService;
  let prisma: {
    task: { findFirst: jest.Mock };
    taskComment: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let statusGateway: { server: { to: jest.Mock } };
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    statusGateway = { server: { to: jest.fn().mockReturnValue({ emit }) } };
    prisma = {
      task: { findFirst: jest.fn() },
      taskComment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new WorkspaceService(
      prisma as unknown as PrismaService,
      {} as unknown as CacheService,
      statusGateway as unknown as StatusGateway,
      {} as unknown as StorageService,
    );
  });

  describe("createTaskComment", () => {
    const dto: CreateTaskCommentDto = { content: "hello @Bob", mentionedUserIds: ["user-2"] };

    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskComment("ws-1", "task-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates the comment, emits task:comment:created, and notifies mentioned users", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: {
          board_id: "board-1",
          board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } },
        },
      });
      const comment = { id: "comment-1", task_id: "task-1", author_id: "user-1", content: dto.content };
      prisma.taskComment.create.mockResolvedValue(comment);
      prisma.taskComment.count.mockResolvedValue(1);

      const result = await service.createTaskComment("ws-1", "task-1", "user-1", dto);

      expect(result).toEqual({ success: true, data: comment });
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(emit).toHaveBeenCalledWith(
        "task:comment:created",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", comment, commentCount: 1 }),
      );
      expect(statusGateway.server.to).toHaveBeenCalledWith("user_user-2");
      expect(emit).toHaveBeenCalledWith("task_comment_mention_notification", expect.any(Object));
    });

    it("does not notify the author if they mention themselves", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: { board_id: "board-1", board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } } },
      });
      prisma.taskComment.create.mockResolvedValue({ id: "comment-1" });
      prisma.taskComment.count.mockResolvedValue(1);

      await service.createTaskComment("ws-1", "task-1", "user-1", { content: "note to self", mentionedUserIds: ["user-1"] });

      expect(statusGateway.server.to).not.toHaveBeenCalledWith("user_user-1");
    });
  });

  describe("updateTaskComment", () => {
    const dto: UpdateTaskCommentDto = { content: "edited" };

    it("throws NotFoundException when the comment does not resolve", async () => {
      prisma.taskComment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when the requester is not the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-2",
        task: { column: { board_id: "board-1" } },
      });

      await expect(
        service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("updates the comment and emits task:comment:updated when the requester is the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-1",
        task: { column: { board_id: "board-1" } },
      });
      const updated = { id: "comment-1", content: "edited", is_edited: true };
      prisma.taskComment.update.mockResolvedValue(updated);

      const result = await service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto);

      expect(result).toEqual({ success: true, data: updated });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:updated",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", comment: updated }),
      );
    });
  });

  describe("deleteTaskComment", () => {
    it("throws ForbiddenException when the requester is not the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-2",
        task: { column: { board_id: "board-1" } },
      });

      await expect(
        service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("soft-deletes the comment and emits task:comment:deleted with the fresh count", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-1",
        task: { column: { board_id: "board-1" } },
      });
      prisma.taskComment.count.mockResolvedValue(0);

      const result = await service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1");

      expect(result).toEqual({ success: true });
      expect(prisma.taskComment.update).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: { is_deleted: true, content: "This comment was deleted." },
      });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:deleted",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", commentId: "comment-1", commentCount: 0 }),
      );
    });
  });
});

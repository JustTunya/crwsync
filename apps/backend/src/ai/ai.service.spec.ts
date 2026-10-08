import { BadRequestException, HttpException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { AiService } from "./ai.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ChatService } from "src/chat/chat.service";
import { CacheKeys, CacheService } from "src/redis";

describe("AiService", () => {
  let service: AiService;
  let prisma: {
    board: { findFirst: jest.Mock };
    chatMessage: { count: jest.Mock };
    workspaceMember: { findUnique: jest.Mock };
  };
  let chatService: { getRoom: jest.Mock };
  let cache: { get: jest.Mock; incrWithTtl: jest.Mock };
  let queue: { add: jest.Mock; getJob: jest.Mock };
  let env: Record<string, string>;

  beforeEach(() => {
    prisma = {
      board: { findFirst: jest.fn().mockResolvedValue({ id: "board-1" }) },
      chatMessage: { count: jest.fn() },
      workspaceMember: { findUnique: jest.fn().mockResolvedValue({ id: "member-1" }) },
    };
    chatService = { getRoom: jest.fn().mockResolvedValue({ success: true }) };
    cache = { get: jest.fn().mockResolvedValue(null), incrWithTtl: jest.fn().mockResolvedValue(1) };
    queue = { add: jest.fn().mockResolvedValue({ id: "job-1" }), getJob: jest.fn() };
    env = { AI_ENABLED: "true", AI_DAILY_LIMIT_PER_USER: "3", AI_MAX_INPUT_MESSAGES: "100" };
    service = new AiService(
      prisma as unknown as PrismaService,
      chatService as unknown as ChatService,
      cache as unknown as CacheService,
      { get: (key: string) => env[key] } as unknown as ConfigService,
      queue as unknown as Queue,
    );
  });

  describe("access control", () => {
    it("does not enqueue or count usage when the user cannot access the room", async () => {
      chatService.getRoom.mockRejectedValue(new NotFoundException("Chat room not found"));

      await expect(service.summarizeRoom("ws-1", "user-1", "room-1")).rejects.toThrow(NotFoundException);
      expect(cache.incrWithTtl).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("rejects a board from another workspace", async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.digestBoard("ws-1", "user-1", "board-9")).rejects.toThrow(NotFoundException);
      expect(prisma.board.findFirst).toHaveBeenCalledWith({ where: { id: "board-9", workspace_id: "ws-1" }, select: { id: true } });
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("rejects task drafts when a selected message is not in the room", async () => {
      prisma.chatMessage.count.mockResolvedValue(1);

      await expect(
        service.draftTasks("ws-1", "user-1", "room-1", { boardId: "board-1", messageIds: ["m1", "m2"] }),
      ).rejects.toThrow(BadRequestException);
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("rejects a stand-up for someone outside the workspace", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.standup("ws-1", "user-1", { memberId: "stranger" })).rejects.toThrow(NotFoundException);
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("hides jobs that belong to another user or workspace", async () => {
      queue.getJob.mockResolvedValue({ data: { userId: "user-2", workspaceId: "ws-1" } });
      await expect(service.getJob("ws-1", "user-1", "job-1")).rejects.toThrow(NotFoundException);

      queue.getJob.mockResolvedValue({ data: { userId: "user-1", workspaceId: "ws-2" } });
      await expect(service.getJob("ws-1", "user-1", "job-1")).rejects.toThrow(NotFoundException);

      queue.getJob.mockResolvedValue(undefined);
      await expect(service.getJob("ws-1", "user-1", "job-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("daily cap", () => {
    it("counts usage per user per day and enqueues with ids only", async () => {
      const res = await service.summarizeRoom("ws-1", "user-1", "room-1", 500);

      expect(res).toEqual({ jobId: "job-1" });
      expect(cache.incrWithTtl).toHaveBeenCalledWith(
        CacheKeys.aiUsage("user-1", new Date().toISOString().slice(0, 10)),
        expect.any(Number),
      );
      expect(queue.add).toHaveBeenCalledWith("summary", {
        feature: "summary",
        userId: "user-1",
        workspaceId: "ws-1",
        roomId: "room-1",
        limit: 100,
      });
    });

    it("defaults the summary window to 50 messages", async () => {
      await service.summarizeRoom("ws-1", "user-1", "room-1");

      expect(queue.add.mock.calls[0][1].limit).toBe(50);
    });

    it("answers 429 once the daily limit is exceeded", async () => {
      cache.incrWithTtl.mockResolvedValue(4);

      const call = service.summarizeRoom("ws-1", "user-1", "room-1");

      await expect(call).rejects.toBeInstanceOf(HttpException);
      await expect(call).rejects.toMatchObject({ status: 429 });
      await expect(call).rejects.toThrow(/Daily AI limit reached \(3 requests per day\)/);
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("still allows the request that reaches the limit exactly", async () => {
      cache.incrWithTtl.mockResolvedValue(3);

      await expect(service.summarizeRoom("ws-1", "user-1", "room-1")).resolves.toEqual({ jobId: "job-1" });
    });

    it("reports remaining requests in the status", async () => {
      cache.get.mockResolvedValue(2);

      await expect(service.getStatus("user-1")).resolves.toEqual({ enabled: true, dailyLimit: 3, remaining: 1 });
    });
  });

  describe("job status", () => {
    const owned = { userId: "user-1", workspaceId: "ws-1" };

    it("reports pending, done and failed jobs", async () => {
      queue.getJob.mockResolvedValue({ data: owned, getState: async () => "active" });
      await expect(service.getJob("ws-1", "user-1", "j")).resolves.toEqual({ status: "pending" });

      queue.getJob.mockResolvedValue({ data: owned, getState: async () => "completed", returnvalue: { feature: "summary", text: "x" } });
      await expect(service.getJob("ws-1", "user-1", "j")).resolves.toEqual({ status: "done", result: { feature: "summary", text: "x" } });

      queue.getJob.mockResolvedValue({ data: owned, getState: async () => "failed", failedReason: "The AI service is unavailable right now." });
      await expect(service.getJob("ws-1", "user-1", "j")).resolves.toEqual({ status: "failed", error: "The AI service is unavailable right now." });
    });
  });
});

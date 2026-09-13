import { NotFoundException } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";

describe("NotificationService", () => {
  let service: NotificationService;
  let prisma: {
    notification: { create: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
  };
  let statusGateway: { server: { to: jest.Mock } };
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    statusGateway = { server: { to: jest.fn().mockReturnValue({ emit }) } };
    prisma = {
      notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    };
    service = new NotificationService(prisma as unknown as PrismaService, statusGateway as unknown as StatusGateway);
  });

  describe("create", () => {
    it("persists the notification and emits the type-specific event to the user's room", async () => {
      const createdAt = new Date("2026-01-01T00:00:00Z");
      prisma.notification.create.mockResolvedValue({ id: "notif-1", created_at: createdAt });

      await service.create("user-1", "ws-1", "TASK_ASSIGNED", { task: { id: "task-1" } });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { user_id: "user-1", workspace_id: "ws-1", type: "TASK_ASSIGNED", payload: { task: { id: "task-1" } } },
      });
      expect(statusGateway.server.to).toHaveBeenCalledWith("user_user-1");
      expect(emit).toHaveBeenCalledWith("task_assigned_notification", {
        task: { id: "task-1" },
        type: "TASK_ASSIGNED",
        notificationId: "notif-1",
        isRead: false,
        createdAt,
      });
    });

    it("strips non-JSON values (e.g. Dates) from the payload before persisting", async () => {
      prisma.notification.create.mockResolvedValue({ id: "notif-1", created_at: new Date() });

      await service.create("user-1", "ws-1", "CHAT_MENTION", { sentAt: new Date("2026-01-01T00:00:00Z") });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payload: { sentAt: "2026-01-01T00:00:00.000Z" } }) }),
      );
    });
  });

  describe("list", () => {
    it("returns notifications with default limit 50", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      const result = await service.list("user-1");
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { user_id: "user-1" },
        orderBy: { created_at: "desc" },
        take: 50,
      });
      expect(result).toEqual([]);
    });

    it("returns notifications with custom limit", async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: "notif-1" }]);
      const result = await service.list("user-1", 10);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { user_id: "user-1" },
        orderBy: { created_at: "desc" },
        take: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("markRead", () => {
    it("throws NotFoundException when no row matches the user + id", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markRead("user-1", "notif-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("marks the notification read when it belongs to the user", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markRead("user-1", "notif-1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "notif-1", user_id: "user-1" },
        data: { is_read: true },
      });
    });
  });

  describe("markAllRead", () => {
    it("marks every unread notification for the user as read", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllRead("user-1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { user_id: "user-1", is_read: false },
        data: { is_read: true },
      });
    });
  });
});

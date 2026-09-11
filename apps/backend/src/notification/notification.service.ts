import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationTypeEnum, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";

const EVENT_BY_TYPE: Record<NotificationTypeEnum, string> = {
  CHAT_MENTION: "mention_notification",
  TASK_COMMENT_MENTION: "task_comment_mention_notification",
  TASK_ASSIGNED: "task_assigned_notification",
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusGateway: StatusGateway,
  ) {}

  async create(
    userId: string,
    workspaceId: string,
    type: NotificationTypeEnum,
    rawPayload: Record<string, unknown>,
  ) {
    // Json columns only accept plain JSON, not the Dates embedded in socket payloads.
    const payload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(rawPayload));

    const notification = await this.prisma.notification.create({
      data: { user_id: userId, workspace_id: workspaceId, type, payload },
    });

    this.statusGateway.server.to(`user_${userId}`).emit(EVENT_BY_TYPE[type], {
      ...(payload as Record<string, unknown>),
      type,
      notificationId: notification.id,
      isRead: false,
      createdAt: notification.created_at,
    });

    return notification;
  }

  list(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, user_id: userId },
      data: { is_read: true },
    });
    if (result.count === 0) throw new NotFoundException("Notification not found");
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }
}

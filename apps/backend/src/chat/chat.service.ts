import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ModuleTypeEnum } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";
import {
  CreateChatRoomDto,
  SendMessageDto,
  EditMessageDto,
  DeleteMessageDto,
} from "src/chat/dto/chat.dto";
import ogs from "open-graph-scraper";
import { assertPublicUrl } from "src/common/security/assert-public-url";
import { PresignedAvatarUpload } from "@crwsync/types";

const POSITION_GAP = 1000;

const SENDER_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  avatar_key: true,
};

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private statusGateway: StatusGateway,
    private storageService: StorageService,
  ) {}

  private assertDmAccess(
    room: { is_direct: boolean; dm_user_a_id: string | null; dm_user_b_id: string | null },
    userId: string,
  ) {
    if (room.is_direct && room.dm_user_a_id !== userId && room.dm_user_b_id !== userId) {
      throw new NotFoundException("Chat room not found");
    }
  }

  async createRoom(
    workspaceId: string,
    userId: string,
    dto: CreateChatRoomDto,
  ) {
    const lastModule = await this.prisma.workspaceModule.findFirst({
      where: { workspace_id: workspaceId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (lastModule?.position ?? 0) + POSITION_GAP;

    const [room, wsModule] = await this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: {
          workspace_id: workspaceId,
          name: dto.name,
        },
      });

      const wsModule = await tx.workspaceModule.create({
        data: {
          workspace_id: workspaceId,
          project_id: dto.project_id || null,
          type: ModuleTypeEnum.CHAT,
          reference_id: room.id,
          name: dto.name,
          position: nextPosition,
        },
      });

      return [room, wsModule];
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:created", wsModule);

    return { success: true, data: room };
  }

  async getRoom(roomId: string, workspaceId: string, userId: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
    });

    if (!room) {
      throw new NotFoundException("Chat room not found");
    }

    this.assertDmAccess(room, userId);

    return { success: true, data: room };
  }

  async presignAttachment(
    workspaceId: string,
    roomId: string,
    userId: string,
    contentType: string,
    fileName: string,
  ): Promise<PresignedAvatarUpload> {
    const room = await this.prisma.chatRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
    });
    if (!room) throw new NotFoundException("Chat room not found");

    this.assertDmAccess(room, userId);

    return this.storageService.presignFileUpload(contentType, fileName, roomId);
  }

  async getMessages(
    roomId: string,
    workspaceId: string,
    userId: string,
    cursor?: string,
    limit: number = 50,
    direction: "before" | "after" = "before",
  ) {
    const room = await this.prisma.chatRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
    });
    if (!room) throw new NotFoundException("Chat room not found");
    this.assertDmAccess(room, userId);

    const take = Math.min(limit, 100);

    const where: Record<string, unknown> = {
      room_id: roomId,
    };

    if (cursor) {
      where.created_at = direction === "after"
        ? { gt: new Date(cursor) }
        : { lt: new Date(cursor) };
    }

    const orderDirection = direction === "after" ? "asc" : "desc";

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { created_at: orderDirection },
      take: take + 1,
      include: {
        sender: { select: SENDER_SELECT },
        mentions: { select: SENDER_SELECT },
        reply_to: {
          select: {
            id: true,
            content: true,
            is_deleted: true,
            sender: { select: { firstname: true, lastname: true } },
          },
        },
        reactions: {
          include: {
            user: { select: SENDER_SELECT },
          },
        },
        read_receipts: {
          include: {
            user: { select: SENDER_SELECT },
          },
        },
        attachments: { orderBy: { created_at: "asc" } },
      },
    });

    const hasMore = messages.length > take;
    if (hasMore) messages.pop();

    // For 'before' direction, reverse to chronological order
    // For 'after' direction, already in chronological order
    const ordered = direction === "after" ? messages : messages.reverse();

    const nextCursor =
      hasMore && ordered.length > 0
        ? direction === "after"
          ? ordered[ordered.length - 1].created_at.toISOString()
          : ordered[0].created_at.toISOString()
        : null;

    return {
      success: true,
      data: {
        messages: ordered,
        next_cursor: nextCursor,
        has_more: hasMore,
      },
    };
  }

  async createMessage(
    workspaceId: string,
    roomId: string,
    senderId: string,
    dto: SendMessageDto,
    messageId?: string,
  ) {
    const createData = {
      ...(messageId ? { id: messageId } : {}),
      workspace_id: workspaceId,
      room_id: roomId,
      sender_id: senderId,
      content: dto.content,
      reply_to_id: dto.reply_to_id,
      is_everyone_mention: dto.isEveryoneMention || false,
      ...(dto.mentionedUserIds?.length
        ? {
            mentions: {
              connect: dto.mentionedUserIds.map((id) => ({ id })),
            },
          }
        : {}),
      ...(dto.attachments?.length
        ? {
            attachments: {
              createMany: {
                data: dto.attachments.map((a) => ({
                  key: a.key,
                  file_name: a.file_name,
                  file_size: a.file_size,
                  mime_type: a.mime_type,
                  uploaded_by: senderId,
                })),
              },
            },
          }
        : {}),
    };

    const include = {
      sender: { select: SENDER_SELECT },
      mentions: { select: SENDER_SELECT },
      reply_to: {
        select: {
          id: true,
          content: true,
          is_deleted: true,
          sender: { select: { firstname: true, lastname: true } },
        },
      },
      reactions: {
        include: {
          user: { select: SENDER_SELECT },
        },
      },
      read_receipts: {
        include: {
          user: { select: SENDER_SELECT },
        },
      },
      attachments: { orderBy: { created_at: "asc" as const } },
    };

    const message = messageId
      ? await this.prisma.chatMessage.upsert({
          where: { id: messageId },
          create: createData,
          update: {},
          include,
        })
      : await this.prisma.chatMessage.create({
          data: createData,
          include,
        });

    const receipt = await this.markAsRead(workspaceId, roomId, senderId, message.id);
    message.read_receipts = [receipt];

    return message;
  }


  async editMessage(
    workspaceId: string,
    roomId: string,
    senderId: string,
    dto: EditMessageDto,
  ) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: dto.message_id },
      select: { id: true, sender_id: true, room_id: true, workspace_id: true },
    });

    if (
      !message ||
      message.room_id !== roomId ||
      message.workspace_id !== workspaceId
    ) {
      throw new NotFoundException("Message not found");
    }

    if (message.sender_id !== senderId) {
      throw new Error("Unauthorized to edit this message");
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: dto.message_id },
      data: {
        content: dto.new_content,
        is_edited: true,
      },
      include: {
        sender: { select: SENDER_SELECT },
      },
    });

    return updated;
  }

  async deleteMessage(
    workspaceId: string,
    roomId: string,
    senderId: string,
    dto: DeleteMessageDto,
  ) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: dto.message_id },
      select: { id: true, sender_id: true, room_id: true, workspace_id: true },
    });

    if (
      !message ||
      message.room_id !== roomId ||
      message.workspace_id !== workspaceId
    ) {
      throw new NotFoundException("Message not found");
    }

    if (message.sender_id !== senderId) {
      throw new Error("Unauthorized to delete this message");
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: dto.message_id },
      data: {
        is_deleted: true,
        content: "This message was deleted.",
      },
      include: {
        sender: { select: SENDER_SELECT },
      },
    });

    return updated;
  }

  async deleteRoom(workspaceId: string, roomId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.deleteMany({ where: { room_id: roomId } });
      await tx.chatReadReceipt.deleteMany({ where: { message: { room_id: roomId } } });
      await tx.messageReaction.deleteMany({ where: { message: { room_id: roomId } } });
      await tx.chatRoom.delete({ where: { id: roomId } });
      await tx.workspaceModule.deleteMany({
        where: { workspace_id: workspaceId, reference_id: roomId },
      });
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:deleted", { referenceId: roomId });

    return { success: true };
  }

  async getOrCreateDm(workspaceId: string, userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException("Cannot start a DM with yourself");
    }

    const [member, otherMember] = await Promise.all([
      this.prisma.workspaceMember.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
      }),
      this.prisma.workspaceMember.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: otherUserId } },
      }),
    ]);

    if (!member || !otherMember) {
      throw new NotFoundException("User is not a member of this workspace");
    }

    const [dmUserAId, dmUserBId] = [userId, otherUserId].sort();

    const existing = await this.prisma.chatRoom.findFirst({
      where: { workspace_id: workspaceId, is_direct: true, dm_user_a_id: dmUserAId, dm_user_b_id: dmUserBId },
    });

    if (existing) {
      return { success: true, data: existing };
    }

    const room = await this.prisma.chatRoom.create({
      data: { workspace_id: workspaceId, is_direct: true, dm_user_a_id: dmUserAId, dm_user_b_id: dmUserBId },
    });

    this.statusGateway.server.to(`user_${otherUserId}`).emit("dm:room_created", room);

    return { success: true, data: room };
  }

  async listDms(workspaceId: string, userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        workspace_id: workspaceId,
        is_direct: true,
        OR: [{ dm_user_a_id: userId }, { dm_user_b_id: userId }],
      },
      include: {
        messages: { orderBy: { created_at: "desc" }, take: 1, select: { created_at: true } },
        read_receipts: { where: { user_id: userId }, take: 1, select: { last_read_at: true } },
      },
    });

    const otherUserIds = rooms.map((room) =>
      room.dm_user_a_id === userId ? room.dm_user_b_id! : room.dm_user_a_id!,
    );

    const otherUsers = await this.prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: SENDER_SELECT,
    });
    const otherUsersById = new Map(otherUsers.map((user) => [user.id, user]));

    const data = rooms.map((room) => {
      const otherUserId = room.dm_user_a_id === userId ? room.dm_user_b_id! : room.dm_user_a_id!;
      const lastMessageAt = room.messages[0]?.created_at ?? null;
      const lastReadAt = room.read_receipts[0]?.last_read_at ?? null;
      const unread = !!lastMessageAt && (!lastReadAt || lastReadAt < lastMessageAt);

      return {
        room: {
          id: room.id,
          workspace_id: room.workspace_id,
          name: room.name,
          is_direct: room.is_direct,
          dm_user_a_id: room.dm_user_a_id,
          dm_user_b_id: room.dm_user_b_id,
          created_at: room.created_at,
          updated_at: room.updated_at,
        },
        otherParticipant: otherUsersById.get(otherUserId)!,
        unread,
      };
    });

    return { success: true, data };
  }

  async toggleReaction(
    workspaceId: string,
    roomId: string,
    userId: string,
    messageId: string,
    emoji: string,
  ) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { room_id: true, workspace_id: true },
    });

    if (
      !message ||
      message.room_id !== roomId ||
      message.workspace_id !== workspaceId
    ) {
      throw new NotFoundException("Message not found");
    }

    const existingReaction = await this.prisma.messageReaction.findUnique({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        await this.prisma.messageReaction.delete({
          where: { id: existingReaction.id },
        });
      } else {
        await this.prisma.messageReaction.update({
          where: { id: existingReaction.id },
          data: { emoji: emoji },
        });
      }
    } else {
      await this.prisma.messageReaction.create({
        data: {
          message_id: messageId,
          user_id: userId,
          emoji: emoji,
        },
      });
    }

    const updatedMessage = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: SENDER_SELECT },
        mentions: { select: SENDER_SELECT },
        reply_to: {
          select: {
            id: true,
            content: true,
            is_deleted: true,
            sender: { select: { firstname: true, lastname: true } },
          },
        },
        reactions: {
          include: {
            user: { select: SENDER_SELECT },
          },
        },
        attachments: { orderBy: { created_at: "asc" } },
      },
    });

    return updatedMessage;
  }

  async getLinkPreview(url: string) {
    try {
      await assertPublicUrl(url);
      const options = { url, timeout: 5000 };
      const { result } = await ogs(options);

      return {
        success: true,
        data: {
          url: result.requestUrl || url,
          title: result.ogTitle || result.twitterTitle || null,
          description:
            result.ogDescription || result.twitterDescription || null,
          image:
            result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || null,
        },
      };
    } catch {
      return {
        success: false,
        data: null,
      };
    }
  }

  async markAsRead(
    workspaceId: string,
    roomId: string,
    userId: string,
    messageId: string,
  ) {
    const receipt = await this.prisma.chatReadReceipt.upsert({
      where: {
        room_id_user_id: {
          room_id: roomId,
          user_id: userId,
        },
      },
      update: {
        message_id: messageId,
        last_read_at: new Date(),
      },
      create: {
        room_id: roomId,
        user_id: userId,
        message_id: messageId,
      },
      include: {
        user: { select: SENDER_SELECT },
      },
    });

    return receipt;
  }
}

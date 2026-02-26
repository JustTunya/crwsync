import { Injectable, NotFoundException } from "@nestjs/common";
import { ModuleTypeEnum } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
import { CreateChatRoomDto, SendMessageDto, EditMessageDto, DeleteMessageDto } from "src/chat/dto/chat.dto";

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
  ) {}

  async createRoom(workspaceId: string, userId: string, dto: CreateChatRoomDto) {
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

  async getRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Chat room not found");
    }

    return { success: true, data: room };
  }

  async getMessages(roomId: string, cursor?: string, limit: number = 50) {
    const take = Math.min(limit, 100);

    const where: Record<string, unknown> = {
      room_id: roomId,
    };

    if (cursor) {
      where.created_at = { lt: new Date(cursor) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: take + 1,
      include: {
        sender: { select: SENDER_SELECT },
      },
    });

    const hasMore = messages.length > take;
    if (hasMore) messages.pop();

    const ordered = messages.reverse();

    const nextCursor = hasMore && ordered.length > 0
      ? ordered[0].created_at.toISOString()
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
  ) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, workspace_id: true },
    });

    if (!room || room.workspace_id !== workspaceId) {
      throw new NotFoundException("Chat room not found");
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        workspace_id: workspaceId,
        room_id: roomId,
        sender_id: senderId,
        content: dto.content,
      },
      include: {
        sender: { select: SENDER_SELECT },
      },
    });

    return message;
  }

  async editMessage(workspaceId: string, roomId: string, senderId: string, dto: EditMessageDto) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: dto.message_id },
      select: { id: true, sender_id: true, room_id: true, workspace_id: true },
    });

    if (!message || message.room_id !== roomId || message.workspace_id !== workspaceId) {
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

  async deleteMessage(workspaceId: string, roomId: string, senderId: string, dto: DeleteMessageDto) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: dto.message_id },
      select: { id: true, sender_id: true, room_id: true, workspace_id: true },
    });

    if (!message || message.room_id !== roomId || message.workspace_id !== workspaceId) {
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
}

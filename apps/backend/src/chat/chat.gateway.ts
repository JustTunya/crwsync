import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { PrismaService } from "src/prisma/prisma.service";
import { ChatService } from "src/chat/chat.service";
import { SendMessageDto, EditMessageDto, DeleteMessageDto } from "src/chat/dto/chat.dto";

@WebSocketGateway({
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  namespace: "chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      this.logger.debug(`Chat client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.error(`Chat connection error: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.debug(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; workspaceId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: data.workspaceId,
          user_id: userId,
        },
      },
    });

    if (!member) {
      client.emit("error", { message: "Not a workspace member" });
      return;
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: data.roomId },
      select: { id: true, workspace_id: true },
    });

    if (!room || room.workspace_id !== data.workspaceId) {
      client.emit("error", { message: "Room not found" });
      return;
    }

    await client.join(`chat_${data.roomId}`);
    client.data.currentRoom = data.roomId;
    client.data.workspaceId = data.workspaceId;

    return { event: "joined_room", data: data.roomId };
  }

  @SubscribeMessage("leave_room")
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    await client.leave(`chat_${data.roomId}`);
    client.data.currentRoom = null;
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data.userId;
    const roomId = client.data.currentRoom;
    const workspaceId = client.data.workspaceId;

    if (!userId || !roomId || !workspaceId) {
      client.emit("error", { message: "Not in a room" });
      return;
    }

    try {
      const message = await this.chatService.createMessage(
        workspaceId,
        roomId,
        userId,
        dto,
      );

      this.server.to(`chat_${roomId}`).emit("new_message", message);

      if (dto.isEveryoneMention) {
        this.server.to(`chat_${roomId}`).emit("mention_notification", message);
      } else if (dto.mentionedUserIds?.length) {
        const sockets = await this.server.in(`chat_${roomId}`).fetchSockets();
        for (const socket of sockets) {
          if (dto.mentionedUserIds.includes(socket.data.userId)) {
            socket.emit("mention_notification", message);
          }
        }
      }

      client.emit("message_ack", {
        client_id: dto.client_id,
        message_id: message.id,
        created_at: message.created_at,
      });
    } catch (error) {
      this.logger.error(`Send message error: ${error}`);
      client.emit("message_error", {
        client_id: dto.client_id,
        error: "Failed to send message",
      });
    }
  }

  @SubscribeMessage("edit_message")
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: EditMessageDto,
  ) {
    const userId = client.data.userId;
    const roomId = client.data.currentRoom;
    const workspaceId = client.data.workspaceId;

    if (!userId || !roomId || !workspaceId) return;

    try {
      const updatedMessage = await this.chatService.editMessage(
        workspaceId,
        roomId,
        userId,
        dto,
      );

      this.server.to(`chat_${roomId}`).emit("message_updated", updatedMessage);
    } catch (error) {
      this.logger.error(`Edit message error: ${error}`);
    }
  }

  @SubscribeMessage("delete_message")
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: DeleteMessageDto,
  ) {
    const userId = client.data.userId;
    const roomId = client.data.currentRoom;
    const workspaceId = client.data.workspaceId;

    if (!userId || !roomId || !workspaceId) return;

    try {
      const updatedMessage = await this.chatService.deleteMessage(
        workspaceId,
        roomId,
        userId,
        dto,
      );

      this.server.to(`chat_${roomId}`).emit("message_updated", updatedMessage);
    } catch (error) {
      this.logger.error(`Delete message error: ${error}`);
    }
  }

  @SubscribeMessage("toggle_reaction")
  async handleToggleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { message_id: string; emoji: string },
  ) {
    const userId = client.data.userId;
    const roomId = client.data.currentRoom;
    const workspaceId = client.data.workspaceId;

    if (!userId || !roomId || !workspaceId) return;

    try {
      const updatedMessage = await this.chatService.toggleReaction(
        workspaceId,
        roomId,
        userId,
        dto.message_id,
        dto.emoji,
      );

      this.server.to(`chat_${roomId}`).emit("message_updated", updatedMessage);
    } catch (error) {
      this.logger.error(`Toggle reaction error: ${error}`);
      client.emit("error", { message: "Failed to toggle reaction" });
    }
  }

  private extractToken(client: Socket): string | null {
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    if (client.handshake.headers?.authorization) {
      return client.handshake.headers.authorization.replace("Bearer ", "");
    }

    const cookieString = client.handshake.headers.cookie;
    if (!cookieString) return null;

    const cookies = cookieString.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies["crw-at"] || null;
  }
}

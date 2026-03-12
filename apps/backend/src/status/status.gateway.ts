import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus, WorkspaceInvite } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { PrismaService } from "src/prisma/prisma.service";

@WebSocketGateway({
  cors: {origin: "*", methods: ["GET", "POST"], credentials: true},
  namespace: "status",
})

export class StatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StatusGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;

      const userRoom = `user_${userId}`;
      await client.join(userRoom);

      const sockets = await this.server.in(userRoom).fetchSockets();
      const count = sockets.length;

      if (count === 1) await this.broadcastUserStatus(userId, "ONLINE");
      
      this.logger.debug(`Client connected: ${client.id} (User: ${userId}, Count: ${count})`);
    } catch (error) {
      this.logger.error(`Error during client connection: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const userRoom = `user_${userId}`;
    
    const sockets = await this.server.in(userRoom).fetchSockets();
    const count = sockets.length;

    if (count === 0) {
      await this.broadcastUserStatus(userId, "OFFLINE");
    }
    
    this.logger.debug(`Client disconnected: ${client.id} (User: ${userId}, Remaining: ${count})`);
  }

  @SubscribeMessage("sub_ws")
  async handleSubscribeWorkspace(client: Socket, workspaceId: string) {
    await client.join(`workspace_${workspaceId}`);
    
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      select: { user_id: true, user: { select: { status_preference: true } } },
    });

    const statuses: Record<string, string> = {};

    for (const member of members) {
      const room = this.server.sockets.adapter.rooms.get(`user_${member.user_id}`);
      if (room && room.size > 0) {
        statuses[member.user_id] = member.user.status_preference;
      }
    }

    client.emit("ws_statuses", statuses);

    return { event: "joined_ws", data: workspaceId };
  }

  @SubscribeMessage("update_status")
  async handleUpdateStatus(client: Socket, status: UserStatus) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: { status_preference: status },
    });

    await this.broadcastUserStatus(userId, status);
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

    const cookies = cookieString.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['crw-at'] || null;
  }

  private async broadcastUserStatus(userId: string, forceStatus?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status_preference: true, ws_memberships: { select: { workspace_id: true } } },
    });

    if (!user) return;

    const status = forceStatus || user.status_preference;

    const rooms = user.ws_memberships.map((m) => `workspace_${m.workspace_id}`);
    
    rooms.push(`user_${userId}`);

    this.server.to(rooms).emit("status:update", {
      userId,
      status,
    });
  }
  
  async emitInviteReceived(userId: string, invite: WorkspaceInvite) {
    this.server.to(`user_${userId}`).emit("invite:received", invite);
  }

  async emitInviteHandled(userId: string, inviteId: string, status: string) {
    this.server.to(`user_${userId}`).emit("invite:handled", { inviteId, status });
  }
}

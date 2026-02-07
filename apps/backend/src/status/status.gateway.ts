import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus, WorkspaceInvite } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { CacheService } from "src/redis/cache.service";
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
    private readonly cacheService: CacheService,
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

      const deviceId = client.id;
      const key = `user:${userId}:sockets`;

      const count = await this.cacheService.sadd(key, deviceId);

      await client.join(`user_${userId}`);

      if (count === 1) await this.broadcastUserStatus(userId);
      
      this.logger.debug(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Error during client connection: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const key = `user:${userId}:sockets`;
    await this.cacheService.srem(key, client.id);
    
    const count = await this.cacheService.scard(key);
    
    if (count === 0) {
      await this.broadcastStatus(userId, "OFFLINE");
    }
    
    this.logger.debug(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  @SubscribeMessage("sub_ws")
  async handleSubscribeWorkspace(client: Socket, workspaceId: string) {
    await client.join(`workspace_${workspaceId}`);
    
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      select: { user_id: true, user: { select: { status_preference: true } } },
    });

    const keys = members.map((m) => `user:${m.user_id}:sockets`);
    const counts = await this.cacheService.scardMulti(keys);

    const statuses: Record<string, string> = {};

    members.forEach((member, index) => {
      const count = counts[index];
      if (count > 0) {
        statuses[member.user_id] = member.user.status_preference;
      }
    });

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

    await this.broadcastUserStatus(userId);
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

  private async broadcastUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status_preference: true, ws_memberships: { select: { workspace_id: true } } },
    });

    if (!user) return;

    const status = user.status_preference;

    const rooms = user.ws_memberships.map((m) => `workspace_${m.workspace_id}`);
    
    rooms.push(`user_${userId}`);

    this.server.to(rooms).emit("status:update", {
      userId,
      status,
    });
  }

  private async broadcastStatus(userId: string, status: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ws_memberships: { select: { workspace_id: true } } },
    });

    if (!user) return;

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

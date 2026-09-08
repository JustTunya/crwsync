import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus, WorkspaceInvite } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { parse } from "cookie";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionService } from "src/session/session.service";
import { createSocketCorsOrigin } from "src/common/utils/socket-cors.util";

@WebSocketGateway({
  cors: { origin: createSocketCorsOrigin(), methods: ["GET", "POST"], credentials: true },
  namespace: "status",
})

export class StatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StatusGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const session = await this.sessionService.findOne(payload.jti).catch(() => null);
      if (!session || session.revoked_at || (session.expires_at && session.expires_at < new Date())) {
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      client.data.userId = userId;
      client.data.sessionId = payload.jti;

      const userRoom = `user_${userId}`;
      await client.join(userRoom);

      const sockets = await this.server.in(userRoom).fetchSockets();
      const count = sockets.length;

      if (count === 1) await this.broadcastUserStatus(userId, "ONLINE");

      client.data.revocationCheck = setInterval(async () => {
        const current = await this.sessionService.findOne(payload.jti).catch(() => null);
        if (!current || current.revoked_at) {
          client.disconnect();
        }
      }, 60_000);

      this.logger.debug(`Client connected: ${client.id} (User: ${userId}, Count: ${count})`);
    } catch (error) {
      this.logger.error(`Error during client connection: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    clearInterval(client.data.revocationCheck);

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
    const userId = client.data.userId;
    if (!userId) return;

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
    });

    if (!member) {
      client.emit("error", { message: "Not a workspace member" });
      return;
    }

    await client.join(`workspace_${workspaceId}`);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      select: { user_id: true, user: { select: { status_preference: true } } },
    });

    const activeSockets = await this.server.in(`workspace_${workspaceId}`).fetchSockets();
    const activeUserIds = new Set(activeSockets.map(s => s.data.userId).filter(Boolean));

    const statuses: Record<string, string> = {};

    for (const member of members) {
      if (activeUserIds.has(member.user_id)) {
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

    if (!Object.values(UserStatus).includes(status)) {
      client.emit("error", { message: "Invalid status" });
      return;
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status_preference: status },
      });

      await this.broadcastUserStatus(userId, status);
    } catch (error) {
      this.logger.error(`Update status error: ${error}`);
      client.emit("error", { message: "Failed to update status" });
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

    return parse(cookieString)["crw-at"] || null;
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

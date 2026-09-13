import { ChatGateway } from "./chat.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { ChatService } from "src/chat/chat.service";
import { StatusGateway } from "src/status/status.gateway";
import { SessionService } from "src/session/session.service";
import { CacheService } from "src/redis";
import { JwtService } from "@nestjs/jwt";
import { Queue } from "bullmq";
import { Socket } from "socket.io";

function makeGateway() {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwtService = { verify: jest.fn() };
  const sessionService = { findOne: jest.fn() };
  const chatService = {};
  const statusGateway = {};
  const cache = {};
  const messageQueue = {};

  const gateway = new ChatGateway(
    jwtService as unknown as JwtService,
    prisma as unknown as PrismaService,
    chatService as unknown as ChatService,
    statusGateway as unknown as StatusGateway,
    sessionService as unknown as SessionService,
    cache as unknown as CacheService,
    messageQueue as unknown as Queue,
  );
  return { gateway, prisma, jwtService, sessionService };
}

describe("ChatGateway.handleConnection (role_version check)", () => {
  it("disconnects when the token's role version no longer matches the user's current role_version", async () => {
    const { gateway, prisma, jwtService, sessionService } = makeGateway();
    jwtService.verify.mockReturnValue({ sub: "user-1", jti: "session-1", rver: 1 });
    sessionService.findOne.mockResolvedValue({ revoked_at: null, expires_at: null });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstname: "A",
      lastname: "B",
      avatar_key: null,
      role_version: 2,
    });

    const client = {
      id: "socket-1",
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "token" }, headers: {} },
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
  });

  it("connects when the token's role version matches", async () => {
    const { gateway, prisma, jwtService, sessionService } = makeGateway();
    jwtService.verify.mockReturnValue({ sub: "user-1", jti: "session-1", rver: 1 });
    sessionService.findOne.mockResolvedValue({ revoked_at: null, expires_at: null });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstname: "A",
      lastname: "B",
      avatar_key: null,
      role_version: 1,
    });

    const client = {
      id: "socket-1",
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "token" }, headers: {} },
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
    await gateway.handleDisconnect(client);
  });
});

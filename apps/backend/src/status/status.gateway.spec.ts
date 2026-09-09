import { StatusGateway } from "./status.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

import { SessionService } from "src/session/session.service";

function makeGateway() {
  const prisma = {
    workspaceMember: { findUnique: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const jwtService = { verify: jest.fn() };
  const sessionService = { findOne: jest.fn() };
  const gateway = new StatusGateway(
    jwtService as unknown as JwtService,
    prisma as unknown as PrismaService,
    sessionService as unknown as SessionService,
  );
  return { gateway, prisma, jwtService, sessionService };
}

describe("StatusGateway.handleSubscribeWorkspace", () => {
  it("rejects a socket whose user is not a member of the workspace", async () => {
    const { gateway, prisma } = makeGateway();
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    const join = jest.fn();
    const emit = jest.fn();
    const client = { data: { userId: "user-1" }, join, emit } as unknown as Socket;

    await gateway.handleSubscribeWorkspace(client, "ws-not-a-member-of");

    expect(join).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.any(String) }));
  });

  it("joins the room when the user is a member", async () => {
    const { gateway, prisma } = makeGateway();
    prisma.workspaceMember.findUnique.mockResolvedValue({ user_id: "user-1", workspace_id: "ws-1" });
    prisma.workspaceMember.findMany.mockResolvedValue([]);

    const join = jest.fn();
    const emit = jest.fn();
    (gateway as unknown as { server: unknown }).server = { in: () => ({ fetchSockets: async () => [] }) };
    const client = { data: { userId: "user-1" }, join, emit } as unknown as Socket;

    await gateway.handleSubscribeWorkspace(client, "ws-1");

    expect(join).toHaveBeenCalledWith("workspace_ws-1");
  });
});

describe("StatusGateway.handleConnection", () => {
  it("keeps the revocation interval out of client.data so the Redis adapter can serialize it", async () => {
    const { gateway, jwtService, sessionService } = makeGateway();
    jwtService.verify.mockReturnValue({ sub: "user-1", jti: "session-1" });
    sessionService.findOne.mockResolvedValue({ revoked_at: null, expires_at: null });
    (gateway as unknown as { server: unknown }).server = { in: () => ({ fetchSockets: async () => [] }) };

    const client = {
      id: "socket-1",
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "token" }, headers: {} },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.data.revocationCheck).toBeUndefined();
    expect(() => JSON.stringify(client.data)).not.toThrow();

    await gateway.handleDisconnect(client);
  });
});

import { StatusGateway } from "./status.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

function makeGateway() {
  const prisma = {
    workspaceMember: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const gateway = new StatusGateway({} as unknown as JwtService, prisma as unknown as PrismaService);
  return { gateway, prisma };
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

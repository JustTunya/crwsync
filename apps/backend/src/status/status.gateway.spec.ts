import { StatusGateway } from "./status.gateway";

function makeGateway() {
  const prisma = {
    workspaceMember: { findUnique: jest.fn(), findMany: jest.fn() },
  } as any;
  const gateway = new StatusGateway({} as any, prisma);
  return { gateway, prisma };
}

describe("StatusGateway.handleSubscribeWorkspace", () => {
  it("rejects a socket whose user is not a member of the workspace", async () => {
    const { gateway, prisma } = makeGateway();
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    const join = jest.fn();
    const emit = jest.fn();
    const client = { data: { userId: "user-1" }, join, emit } as any;

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
    (gateway as any).server = { in: () => ({ fetchSockets: async () => [] }) };
    const client = { data: { userId: "user-1" }, join, emit } as any;

    await gateway.handleSubscribeWorkspace(client, "ws-1");

    expect(join).toHaveBeenCalledWith("workspace_ws-1");
  });
});

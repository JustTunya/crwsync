import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { WorkspaceInviteStatusEnum } from "@crwsync/types";
import { Request } from "express";
import { HasPendingInviteGuard } from "src/workspace/guards/ws-invite.guard";
import { PrismaService } from "src/prisma/prisma.service";
import { ActiveUser } from "src/common/types/active-user.type";

describe("HasPendingInviteGuard", () => {
  let prisma: { workspaceInvite: { findFirst: jest.Mock } };
  let guard: HasPendingInviteGuard;

  const buildContext = (request: Partial<Request & { user?: ActiveUser }>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    prisma = { workspaceInvite: { findFirst: jest.fn() } };
    guard = new HasPendingInviteGuard(prisma as unknown as PrismaService);
  });

  it("throws ForbiddenException when there is no authenticated user", async () => {
    const context = buildContext({ params: { workspaceId: "workspace-1" } });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(prisma.workspaceInvite.findFirst).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when the workspaceId param is missing", async () => {
    const context = buildContext({
      user: { userId: "user-1" } as ActiveUser,
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(prisma.workspaceInvite.findFirst).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when no pending invite exists", async () => {
    prisma.workspaceInvite.findFirst.mockResolvedValue(null);
    const context = buildContext({
      user: { userId: "user-1" } as ActiveUser,
      params: { workspaceId: "workspace-1" },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("allows access when a pending invite exists", async () => {
    prisma.workspaceInvite.findFirst.mockResolvedValue({ id: "invite-1" });
    const context = buildContext({
      user: { userId: "user-1" } as ActiveUser,
      params: { workspaceId: "workspace-1" },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.workspaceInvite.findFirst).toHaveBeenCalledWith({
      where: {
        workspace_id: "workspace-1",
        invitee_id: "user-1",
        status: WorkspaceInviteStatusEnum.PENDING,
      },
      select: { id: true },
    });
  });
});

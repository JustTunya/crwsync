import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";

describe("IsMemberGuard", () => {
  let prisma: { workspaceMember: { findUnique: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock };
  let guard: IsMemberGuard;

  const buildContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    prisma = { workspaceMember: { findUnique: jest.fn() } };
    cache = { get: jest.fn(), set: jest.fn() };
    guard = new IsMemberGuard(prisma as unknown as PrismaService, cache as unknown as CacheService);
  });

  it("denies access without throwing when the user is not authenticated", async () => {
    const context = buildContext({ params: { workspaceId: "workspace-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(prisma.workspaceMember.findUnique).not.toHaveBeenCalled();
  });

  it("denies access without throwing when the workspaceId param is missing", async () => {
    const context = buildContext({ user: { userId: "user-1" }, params: {} });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(prisma.workspaceMember.findUnique).not.toHaveBeenCalled();
  });

  it("uses the cached member and attaches it to the request without hitting the database", async () => {
    const cachedMember = { id: "member-1", role: "MEMBER", workspace: { id: "workspace-1" } };
    cache.get.mockResolvedValue(cachedMember);
    const request = { user: { userId: "user-1" }, params: { workspaceId: "workspace-1" } };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.workspaceMember.findUnique).not.toHaveBeenCalled();
    expect(request).toMatchObject({
      member: cachedMember,
      workspace: cachedMember.workspace,
    });
  });

  it("throws ForbiddenException when the user is not a member of the workspace", async () => {
    cache.get.mockResolvedValue(null);
    prisma.workspaceMember.findUnique.mockResolvedValue(null);
    const context = buildContext({ user: { userId: "user-1" }, params: { workspaceId: "workspace-1" } });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("loads the member from the database, caches it, and attaches it to the request", async () => {
    cache.get.mockResolvedValue(null);
    const dbMember = { id: "member-1", role: "ADMIN", workspace: { id: "workspace-1" } };
    prisma.workspaceMember.findUnique.mockResolvedValue(dbMember);
    const request = { user: { userId: "user-1" }, params: { workspaceId: "workspace-1" } };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: {
        workspace_id_user_id: {
          workspace_id: "workspace-1",
          user_id: "user-1",
        },
      },
      include: { workspace: true },
    });
    expect(cache.set).toHaveBeenCalledWith(
      CacheKeys.workspaceMember("workspace-1", "user-1"),
      dbMember,
      CacheTTL.WORKSPACE_MEMBER,
    );
    expect(request).toMatchObject({
      member: dbMember,
      workspace: dbMember.workspace,
    });
  });
});

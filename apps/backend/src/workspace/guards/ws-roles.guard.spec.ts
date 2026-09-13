import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceRoleEnum, WorkspaceMember } from "@prisma/client";
import { WorkspaceRolesGuard } from "src/workspace/guards/ws-roles.guard";
import { ROLES_KEY } from "src/workspace/decorators/ws-roles.decorator";

describe("WorkspaceRolesGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: jest.fn().mockReturnValue("handler"),
      getClass: jest.fn().mockReturnValue("class"),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
  });

  it("allows access when no workspace roles are required", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new WorkspaceRolesGuard(reflector as unknown as Reflector);
    const context = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, ["handler", "class"]);
  });

  it("throws ForbiddenException when there is no member attached to the request", () => {
    reflector.getAllAndOverride.mockReturnValue([WorkspaceRoleEnum.ADMIN]);
    const guard = new WorkspaceRolesGuard(reflector as unknown as Reflector);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when the member's role is not among the required roles", () => {
    reflector.getAllAndOverride.mockReturnValue([WorkspaceRoleEnum.OWNER]);
    const guard = new WorkspaceRolesGuard(reflector as unknown as Reflector);
    const member = { role: WorkspaceRoleEnum.GUEST } as WorkspaceMember;
    const context = buildContext({ member });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException(`Insufficient permissions. Required: ${WorkspaceRoleEnum.OWNER}`),
    );
  });

  it("allows access when the member's role is among the required roles", () => {
    reflector.getAllAndOverride.mockReturnValue([WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN]);
    const guard = new WorkspaceRolesGuard(reflector as unknown as Reflector);
    const member = { role: WorkspaceRoleEnum.ADMIN } as WorkspaceMember;
    const context = buildContext({ member });

    expect(guard.canActivate(context)).toBe(true);
  });
});

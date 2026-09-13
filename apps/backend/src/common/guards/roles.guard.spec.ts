import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleEnum } from "@crwsync/types";
import { Request } from "express";
import { RolesGuard } from "src/common/guards/roles.guard";
import { ROLES_KEY } from "src/common/constants";

describe("RolesGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (request: Partial<Request & { user?: { role?: RoleEnum } }>): ExecutionContext =>
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

  it("allows access when no roles are required", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, ["handler", "class"]);
  });

  it("allows access when the required roles list is empty", () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it("throws ForbiddenException when the user has no role", () => {
    reflector.getAllAndOverride.mockReturnValue([RoleEnum.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = buildContext({ user: {} });

    expect(() => guard.canActivate(context)).toThrow(new ForbiddenException("Missing role"));
  });

  it("throws ForbiddenException when the user's role is not among the required roles", () => {
    reflector.getAllAndOverride.mockReturnValue([RoleEnum.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = buildContext({ user: { role: RoleEnum.MEMBER } });

    expect(() => guard.canActivate(context)).toThrow(new ForbiddenException("Forbidden"));
  });

  it("allows access when the user's role is among the required roles", () => {
    reflector.getAllAndOverride.mockReturnValue([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = buildContext({ user: { role: RoleEnum.SUPER_ADMIN } });

    expect(guard.canActivate(context)).toBe(true);
  });
});

import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";
import { Request } from "express";
import { OwnershipGuard } from "src/common/guards/ownership.guard";

describe("OwnershipGuard", () => {
  const buildContext = (
    request: Partial<Request & { user?: { userId: string; role?: RoleEnum } }>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it("throws ForbiddenException when there is no authenticated user", () => {
    const guard = new OwnershipGuard();
    const context = buildContext({ params: { userId: "user-1" } });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when the target param is missing", () => {
    const guard = new OwnershipGuard();
    const context = buildContext({ user: { userId: "user-1" }, params: {} });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows an admin to access any target", () => {
    const guard = new OwnershipGuard();
    const context = buildContext({
      user: { userId: "user-1", role: RoleEnum.ADMIN },
      params: { userId: "user-2" },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows a user to access their own resource", () => {
    const guard = new OwnershipGuard();
    const context = buildContext({
      user: { userId: "user-1", role: RoleEnum.MEMBER },
      params: { userId: "user-1" },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("throws ForbiddenException when the user does not own the target", () => {
    const guard = new OwnershipGuard();
    const context = buildContext({
      user: { userId: "user-1", role: RoleEnum.MEMBER },
      params: { userId: "user-2" },
    });

    expect(() => guard.canActivate(context)).toThrow(new ForbiddenException("Not owner"));
  });

  it("reads the target id from a custom param name", () => {
    const guard = new OwnershipGuard("workspaceOwnerId");
    const context = buildContext({
      user: { userId: "user-1", role: RoleEnum.MEMBER },
      params: { workspaceOwnerId: "user-1" },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});

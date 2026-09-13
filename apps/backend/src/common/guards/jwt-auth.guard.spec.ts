import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleEnum } from "@crwsync/types";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { IS_PUBLIC_KEY } from "src/common/constants";
import { ActiveUser } from "src/common/types/active-user.type";

describe("JwtAuthGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;
  let context: ExecutionContext;
  let superCanActivateSpy: jest.SpyInstance;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
    context = {
      getHandler: jest.fn().mockReturnValue("handler"),
      getClass: jest.fn().mockReturnValue("class"),
    } as unknown as ExecutionContext;

    superCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), "canActivate")
      .mockReturnValue(true);
  });

  afterEach(() => {
    superCanActivateSpy.mockRestore();
  });

  describe("canActivate", () => {
    it("allows access without invoking passport when the route is public", () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, ["handler", "class"]);
      expect(superCanActivateSpy).not.toHaveBeenCalled();
    });

    it("delegates to the passport strategy when the route is not public", () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    });

    it("delegates to the passport strategy when no metadata is set", () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      guard.canActivate(context);

      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    });
  });

  describe("handleRequest", () => {
    it("returns the user on success", () => {
      const user: ActiveUser = {
        userId: "user-1",
        sessionId: "session-1",
        email: "test@example.com",
        role: RoleEnum.MEMBER,
        roleVersion: 1,
      };

      expect(guard.handleRequest(null, user)).toBe(user);
    });

    it("throws UnauthorizedException when an error is present", () => {
      expect(() => guard.handleRequest(new Error("boom"), false)).toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when no user is returned", () => {
      expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
    });
  });
});

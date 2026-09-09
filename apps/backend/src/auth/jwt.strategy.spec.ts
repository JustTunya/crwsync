import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "@crwsync/types";
import { JwtStrategy } from "./jwt.strategy";
import { SessionService } from "src/session/session.service";
import { UserService } from "src/user/user.service";

function makeStrategy() {
  const config = { get: jest.fn().mockReturnValue("test-secret") };
  const sessionService = {
    findOne: jest.fn().mockResolvedValue({ revoked_at: null, expires_at: null }),
  };
  const userService = { findOne: jest.fn() };
  const strategy = new JwtStrategy(
    config as unknown as ConfigService,
    sessionService as unknown as SessionService,
    userService as unknown as UserService,
  );
  return { strategy, userService };
}

describe("JwtStrategy.validate", () => {
  it("rejects a token whose role_version is behind the user's current role_version", async () => {
    const { strategy, userService } = makeStrategy();
    userService.findOne.mockResolvedValue({ id: "user-1", role_version: 2 });

    await expect(
      strategy.validate({ sub: "user-1", jti: "session-1", email: "a@b.com", role: "USER", rver: 1 } as unknown as JwtPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("accepts a token whose role_version matches", async () => {
    const { strategy, userService } = makeStrategy();
    userService.findOne.mockResolvedValue({ id: "user-1", role_version: 1 });

    const result = await strategy.validate({
      sub: "user-1",
      jti: "session-1",
      email: "a@b.com",
      role: "USER",
      rver: 1,
    } as unknown as JwtPayload);

    expect(result.userId).toBe("user-1");
  });
});

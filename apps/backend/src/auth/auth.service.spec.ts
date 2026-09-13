import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { UserService } from "src/user/user.service";
import { VerificationService } from "src/email-verification/email-verification.service";
import { SessionService } from "src/session/session.service";
import { JwtService } from "@nestjs/jwt";
import { UserPublic } from "src/prisma/selects";

describe("AuthService (Cluster 1 signin verification)", () => {
  let authService: AuthService;
  let userService: { recordLogin: jest.Mock; findOne: jest.Mock; findByEmailOrUsername: jest.Mock };
  let verificationService: { findByEmail: jest.Mock };
  let sessionService: { create: jest.Mock; rotate: jest.Mock; verify: jest.Mock; revoke: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(() => {
    userService = {
      recordLogin: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      findByEmailOrUsername: jest.fn(),
    };
    verificationService = {
      findByEmail: jest.fn(),
    };
    sessionService = {
      create: jest.fn().mockResolvedValue({ token: "refresh-token" }),
      rotate: jest.fn(),
      verify: jest.fn(),
      revoke: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue("access-token"),
    };

    authService = new AuthService(
      userService as unknown as UserService,
      verificationService as unknown as VerificationService,
      sessionService as unknown as SessionService,
      jwtService as unknown as JwtService,
    );
  });

  it("blocks signin if email_verified_at is null", async () => {
    const unverifiedUser = {
      id: "u-1",
      email: "unverified@example.com",
      email_verified_at: null,
      role: "MEMBER",
      role_version: 1,
      status_preference: "ONLINE",
    } as unknown as UserPublic;

    await expect(
      authService.signin(unverifiedUser, {} as unknown as Request),
    ).rejects.toThrow(BadRequestException);

    expect(userService.recordLogin).not.toHaveBeenCalled();
    expect(sessionService.create).not.toHaveBeenCalled();
  });

  it("allows signin if email_verified_at is present and records login", async () => {
    const verifiedUser = {
      id: "u-1",
      email: "verified@example.com",
      email_verified_at: new Date(),
      role: "MEMBER",
      role_version: 1,
      status_preference: "ONLINE",
    } as unknown as UserPublic;

    const result = await authService.signin(verifiedUser, {} as unknown as Request);

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(userService.recordLogin).toHaveBeenCalledWith("u-1");
  });

  describe("refresh", () => {
    it("throws BadRequestException when refresh token cookie is missing", async () => {
      const req = { cookies: {} } as unknown as Request;

      await expect(authService.refresh(req)).rejects.toThrow(BadRequestException);
      expect(sessionService.rotate).not.toHaveBeenCalled();
    });

    it("delegates directly to sessionService.rotate with old_token and issues new tokens", async () => {
      const req = { cookies: { "crw-rt": "old-token-val" } } as unknown as Request;
      sessionService.rotate.mockResolvedValue({
        session: { id: "new-session-id", user_id: "user-1", persistent: true },
        refreshToken: "new-refresh-token",
      });
      userService.findOne.mockResolvedValue({
        id: "user-1",
        email: "u1@example.com",
        role: "MEMBER",
        role_version: 1,
        status_preference: "ONLINE",
      });

      const result = await authService.refresh(req);

      expect(sessionService.verify).not.toHaveBeenCalled();
      expect(sessionService.rotate).toHaveBeenCalledWith({ old_token: "old-token-val" }, req);
      expect(userService.findOne).toHaveBeenCalledWith("user-1");
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "new-refresh-token",
        persistent: true,
      });
    });

    it("propagates errors thrown by sessionService.rotate", async () => {
      const req = { cookies: { "crw-rt": "reused-token" } } as unknown as Request;
      sessionService.rotate.mockRejectedValue(
        new UnauthorizedException("Session already used — possible token reuse detected"),
      );

      await expect(authService.refresh(req)).rejects.toThrow(UnauthorizedException);
      expect(sessionService.verify).not.toHaveBeenCalled();
      expect(userService.findOne).not.toHaveBeenCalled();
    });
  });
});

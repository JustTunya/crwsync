import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { UserService } from "src/user/user.service";
import { VerificationService } from "src/email-verification/email-verification.service";
import { SessionService } from "src/session/session.service";
import { JwtService } from "@nestjs/jwt";
import { UserPublic } from "src/prisma/selects";
import { SignupDto } from "src/auth/dto/signup.dto";

describe("AuthService (Cluster 1 signin verification)", () => {
  let authService: AuthService;
  let userService: {
    recordLogin: jest.Mock;
    findOne: jest.Mock;
    findByEmailOrUsername: jest.Mock;
    create: jest.Mock;
  };
  let verificationService: { findByEmail: jest.Mock; create: jest.Mock };
  let sessionService: { create: jest.Mock; rotate: jest.Mock; verify: jest.Mock; revoke: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(() => {
    userService = {
      recordLogin: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      create: jest.fn(),
    };
    verificationService = {
      findByEmail: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    };
    sessionService = {
      create: jest.fn().mockResolvedValue({ token: "refresh-token" }),
      rotate: jest.fn(),
      verify: jest.fn(),
      revoke: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue("access-token"),
      verify: jest.fn(),
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

  describe("validateUser", () => {
    it("returns null when no user matches the identifier", async () => {
      userService.findByEmailOrUsername.mockResolvedValue(null);

      const result = await authService.validateUser({ identifier: "nobody", password: "whatever" });

      expect(result).toBeNull();
    });

    it("returns null when the password does not match the stored hash", async () => {
      const { hash } = await import("bcrypt");
      userService.findByEmailOrUsername.mockResolvedValue({
        id: "u-1",
        password_hash: await hash("CorrectPassword123!", 10),
      });

      const result = await authService.validateUser({ identifier: "u1@example.com", password: "WrongPassword123!" });

      expect(result).toBeNull();
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it("returns the public user when the password matches", async () => {
      const { hash } = await import("bcrypt");
      userService.findByEmailOrUsername.mockResolvedValue({
        id: "u-1",
        password_hash: await hash("CorrectPassword123!", 10),
      });
      userService.findOne.mockResolvedValue({ id: "u-1", email: "u1@example.com" });

      const result = await authService.validateUser({ identifier: "u1@example.com", password: "CorrectPassword123!" });

      expect(result).toEqual({ id: "u-1", email: "u1@example.com" });
      expect(userService.findOne).toHaveBeenCalledWith("u-1");
    });
  });

  describe("signup", () => {
    const dto: SignupDto = {
      email: "new@example.com",
      username: "newuser",
      firstname: "New",
      lastname: "User",
      birthdate: "2000-01-01",
      password: "Password123!",
    };

    it("throws BadRequestException when a user with that email already exists", async () => {
      userService.findByEmailOrUsername.mockResolvedValue({ id: "existing" });

      await expect(authService.signup(dto)).rejects.toThrow(BadRequestException);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it("creates the user and triggers email verification", async () => {
      userService.findByEmailOrUsername.mockResolvedValue(null);
      userService.create.mockResolvedValue({ id: "u-1", email: dto.email });

      const result = await authService.signup(dto);

      expect(result).toEqual({ id: "u-1", email: dto.email });
      expect(verificationService.create).toHaveBeenCalledWith({ user_id: "u-1", email: dto.email });
    });
  });

  describe("signout", () => {
    function makeRes() {
      return { clearCookie: jest.fn() } as unknown as Response;
    }

    it("verifies and revokes the session when a refresh token cookie is present", async () => {
      const req = { cookies: { "crw-rt": "refresh-val", "crw-at": "access-val" } } as unknown as Request;
      const res = makeRes();
      sessionService.verify.mockResolvedValue({ id: "session-1" });

      await authService.signout(req, res);

      expect(sessionService.verify).toHaveBeenCalledWith({ token: "refresh-val" });
      expect(sessionService.revoke).toHaveBeenCalledWith("session-1");
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it("falls back to the access token jti when there is no refresh token cookie", async () => {
      const req = { cookies: { "crw-at": "access-val" } } as unknown as Request;
      const res = makeRes();
      jwtService.verify.mockReturnValue({ jti: "jti-1", sub: "u-1", email: "u1@example.com" });

      await authService.signout(req, res);

      expect(sessionService.verify).not.toHaveBeenCalled();
      expect(sessionService.revoke).toHaveBeenCalledWith("jti-1");
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it("clears cookies even when neither cookie is present", async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = makeRes();

      await authService.signout(req, res);

      expect(sessionService.verify).not.toHaveBeenCalled();
      expect(sessionService.revoke).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it("clears cookies even when session verification throws", async () => {
      const req = { cookies: { "crw-rt": "refresh-val" } } as unknown as Request;
      const res = makeRes();
      sessionService.verify.mockRejectedValue(new UnauthorizedException("Invalid session token"));

      await expect(authService.signout(req, res)).rejects.toThrow(UnauthorizedException);
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe("sessionBootstrap", () => {
    it("returns the user directly when the access token is valid", async () => {
      const req = { cookies: { "crw-at": "access-val" } } as unknown as Request;
      jwtService.verify.mockReturnValue({ sub: "u-1" });
      userService.findOne.mockResolvedValue({ id: "u-1" });

      const result = await authService.sessionBootstrap(req);

      expect(result).toEqual({ user: { id: "u-1" } });
      expect(sessionService.rotate).not.toHaveBeenCalled();
    });

    it("falls back to refresh when the access token is invalid, returning refreshed tokens", async () => {
      const req = { cookies: { "crw-at": "bad-val", "crw-rt": "refresh-val" } } as unknown as Request;
      jwtService.verify
        .mockImplementationOnce(() => {
          throw new UnauthorizedException();
        })
        .mockImplementationOnce(() => ({ sub: "u-1" }));
      sessionService.rotate.mockResolvedValue({
        session: { id: "new-session", user_id: "u-1", persistent: false },
        refreshToken: "new-refresh-token",
      });
      userService.findOne.mockResolvedValue({ id: "u-1" });

      const result = await authService.sessionBootstrap(req);

      expect(result.user).toEqual({ id: "u-1" });
      expect(result.refresh?.refreshToken).toBe("new-refresh-token");
    });

    it("throws UnauthorizedException when there is no access token and refresh fails", async () => {
      const req = { cookies: {} } as unknown as Request;

      await expect(authService.sessionBootstrap(req)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("me", () => {
    it("returns the user when found", async () => {
      userService.findOne.mockResolvedValue({ id: "u-1" });

      const result = await authService.me({ userId: "u-1" });

      expect(result).toEqual({ id: "u-1" });
    });

    it("throws UnauthorizedException when the user is not found", async () => {
      userService.findOne.mockResolvedValue(null);

      await expect(authService.me({ userId: "missing" })).rejects.toThrow(UnauthorizedException);
    });
  });
});

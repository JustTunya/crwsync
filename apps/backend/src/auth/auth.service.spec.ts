import { BadRequestException } from "@nestjs/common";
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
  let sessionService: { create: jest.Mock };
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
      authService.signin(unverifiedUser, {} as any),
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

    const result = await authService.signin(verifiedUser, {} as any);

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(userService.recordLogin).toHaveBeenCalledWith("u-1");
  });
});

import { BadRequestException } from "@nestjs/common";
import { UserService } from "./user.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { VerificationService } from "src/email-verification/email-verification.service";
import { SessionService } from "src/session/session.service";
import { StorageService } from "src/storage/storage.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

describe("UserService (Cluster 1 fixes)", () => {
  let userService: UserService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    emailVerification: {
      deleteMany: jest.Mock;
    };
  };
  let cache: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let verificationService: {
    create: jest.Mock;
  };
  let sessionService: {
    revokeAll: jest.Mock;
  };
  let storageService: {
    deleteObject: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      emailVerification: {
        deleteMany: jest.fn(),
      },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    verificationService = {
      create: jest.fn().mockResolvedValue({}),
    };

    sessionService = {
      revokeAll: jest.fn().mockResolvedValue(undefined),
    };

    storageService = {
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    userService = new UserService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      verificationService as unknown as VerificationService,
      sessionService as unknown as SessionService,
      storageService as unknown as StorageService,
    );
  });

  describe("update", () => {
    it("does not accept a bare password field (UpdateUserDto has no password key)", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, firstname: "Updated" });

      const dto: UpdateUserDto = {
        firstname: "Updated",
      };

      await userService.update("user-1", dto);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const updateCall = prisma.user.update.mock.calls[0][0];

      expect(updateCall.where).toEqual({ id: "user-1" });
      expect(updateCall.data).not.toHaveProperty("password");
      expect(updateCall.data).not.toHaveProperty("password_hash");
      expect(updateCall.data.firstname).toBe("Updated");
    });

    it("rejects an avatar_key that doesn't belong to the calling user", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const dto: UpdateUserDto = {
        avatar_key: "user-2_some-uuid.png",
      };

      await expect(userService.update("user-1", dto)).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("rejects when currentPassword does not match the stored hash", async () => {
      const { hash } = await import("bcrypt");
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
        password_hash: await hash("CorrectPassword123!", 10),
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const dto: ChangePasswordDto = { currentPassword: "WrongPassword123!", newPassword: "NewPassword123!" };

      await expect(userService.changePassword("user-1", dto, "session-1")).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sessionService.revokeAll).not.toHaveBeenCalled();
    });

    it("rehashes the password and revokes every other session on success", async () => {
      const { hash } = await import("bcrypt");
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
        password_hash: await hash("CorrectPassword123!", 10),
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser });

      const dto: ChangePasswordDto = { currentPassword: "CorrectPassword123!", newPassword: "NewPassword123!" };

      await userService.changePassword("user-1", dto, "session-1");

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: "user-1" });
      expect(updateCall.data).toHaveProperty("password_hash");
      expect(updateCall.data).toHaveProperty("last_password_change");
      expect(updateCall.data.password_hash).not.toBe(mockUser.password_hash);

      expect(sessionService.revokeAll).toHaveBeenCalledWith("user-1", "session-1");
    });
  });

  describe("update email change handling", () => {
    it("invalidates old verification, sets email_verified_at null, and triggers verificationService.create", async () => {
      const mockUser = {
        id: "user-1",
        email: "old@example.com",
        username: "testuser",
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue(null); // new email available
      prisma.user.update.mockResolvedValue({ ...mockUser, email: "new@example.com", email_verified_at: null });

      const dto: UpdateUserDto = {
        email: "new@example.com",
      };

      await userService.update("user-1", dto);

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.email).toBe("new@example.com");
      expect(updateCall.data.email_verified_at).toBeNull();

      expect(prisma.emailVerification.deleteMany).toHaveBeenCalledWith({
        where: { user_id: "user-1" },
      });
      expect(verificationService.create).toHaveBeenCalledWith({
        user_id: "user-1",
        email: "new@example.com",
      });
    });

    it("rejects if new email is already taken", async () => {
      const mockUser = {
        id: "user-1",
        email: "old@example.com",
        username: "testuser",
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue({ id: "other-user" });

      await expect(
        userService.update("user-1", { email: "taken@example.com" }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("dedicated system methods", () => {
    it("recordLogin updates last_login directly and invalidates cache", async () => {
      prisma.user.update.mockResolvedValue({});

      await userService.recordLogin("user-1");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ last_login: expect.any(Date) }),
        }),
      );
      expect(cache.del).toHaveBeenCalled();
    });
  });
});

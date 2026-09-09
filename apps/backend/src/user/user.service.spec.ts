import { BadRequestException } from "@nestjs/common";
import { UserService } from "./user.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { VerificationService } from "src/email-verification/email-verification.service";
import { UpdateUserDto } from "./dto/update-user.dto";

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

    userService = new UserService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      verificationService as unknown as VerificationService,
    );
  });

  describe("update password handling", () => {
    it("hashes password and does not pass 'password' key to prisma.update", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, firstname: "Updated" });

      const dto: UpdateUserDto = {
        password: "NewPassword123!",
        firstname: "Updated",
      };

      await userService.update("user-1", dto);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const updateCall = prisma.user.update.mock.calls[0][0];

      expect(updateCall.where).toEqual({ id: "user-1" });
      expect(updateCall.data).not.toHaveProperty("password");
      expect(updateCall.data).toHaveProperty("password_hash");
      expect(updateCall.data).toHaveProperty("last_password_change");
      expect(typeof updateCall.data.password_hash).toBe("string");
      expect(updateCall.data.firstname).toBe("Updated");
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

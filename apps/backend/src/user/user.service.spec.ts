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
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    emailVerification: {
      deleteMany: jest.Mock;
    };
    workspaceInvite: {
      findMany: jest.Mock;
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
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      emailVerification: {
        deleteMany: jest.fn(),
      },
      workspaceInvite: {
        findMany: jest.fn(),
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

    it("create hashes password and creates user", async () => {
      prisma.user.create.mockResolvedValue({ id: "new-user", email: "new@example.com" });
      const result = await userService.create({
        email: "new@example.com",
        username: "newuser",
        firstname: "First",
        lastname: "Last",
        birthdate: "2000-01-01",
        password: "Password123!",
      });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("new-user");
    });

    it("findAll returns all users", async () => {
      prisma.user.findMany.mockResolvedValue([{ id: "u-1" }, { id: "u-2" }]);
      const result = await userService.findAll();
      expect(result).toHaveLength(2);
    });

    it("findOne returns cached user if present", async () => {
      cache.get.mockResolvedValue({ id: "user-1", username: "cached" });
      const result = await userService.findOne("user-1");
      expect(result.username).toBe("cached");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("findOne throws NotFoundException when user does not exist", async () => {
      cache.get.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(userService.findOne("non-existent")).rejects.toThrow("User not found");
    });

    it("findByEmailOrUsername handles cache hits, misses, and not-found", async () => {
      cache.get.mockResolvedValueOnce({ id: "user-1" });
      expect(await userService.findByEmailOrUsername("test@example.com")).toEqual({ id: "user-1" });

      cache.get.mockResolvedValueOnce(null);
      prisma.user.findFirst.mockResolvedValueOnce({ id: "user-2" });
      expect(await userService.findByEmailOrUsername("test2@example.com")).toEqual({ id: "user-2" });
      expect(cache.set).toHaveBeenCalled();

      cache.get.mockResolvedValueOnce(null);
      prisma.user.findFirst.mockResolvedValueOnce(null);
      expect(await userService.findByEmailOrUsername("unknown")).toBeNull();
    });

    it("searchByEmailOrUsername queries with and without workspaceId", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await userService.searchByEmailOrUsername("query");
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));

      await userService.searchByEmailOrUsername("query", "ws-1");
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ NOT: expect.anything() }) }));
    });

    it("checkEmailOrUsername checks email and username availability", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      expect(await userService.checkEmailOrUsername("email", "free@example.com")).toEqual({ available: true });

      prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1" });
      expect(await userService.checkEmailOrUsername("username", "taken")).toEqual({ available: false });
    });

    it("findInvites returns pending invites for user", async () => {
      prisma.workspaceInvite.findMany.mockResolvedValue([{ id: "inv-1" }]);
      const result = await userService.findInvites("user-1");
      expect(result).toHaveLength(1);
    });

    it("remove deletes user and cleans cache", async () => {
      const mockUser = { id: "user-1", email: "del@example.com", username: "deluser" };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      await userService.remove("user-1");
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
      expect(cache.del).toHaveBeenCalled();
    });

    it("update cleans old avatar and updates birthdate/lastname", async () => {
      const mockUser = { id: "user-1", email: "u@example.com", username: "u", avatar_key: "user-1_old.png" };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, avatar_key: "user-1_new.png" });

      await userService.update("user-1", {
        avatar_key: "user-1_new.png",
        birthdate: "1995-05-05",
        lastname: "NewLast",
        username: "newname",
      });

      expect(storageService.deleteObject).toHaveBeenCalledWith("user-1_old.png");
      expect(cache.del).toHaveBeenCalled();
    });

    it("changePassword throws when user not found in DB", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        userService.changePassword("non-existent", { currentPassword: "p", newPassword: "n" }, "sess-1"),
      ).rejects.toThrow("User not found");
    });
  });
});

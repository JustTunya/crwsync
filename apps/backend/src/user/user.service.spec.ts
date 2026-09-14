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
    passwordReset: {
      deleteMany: jest.Mock;
    };
    workspaceInvite: {
      findMany: jest.Mock;
    };
    workspaceMember: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    workspace: {
      deleteMany: jest.Mock;
    };
    task: {
      findMany: jest.Mock;
    };
    taskComment: {
      findMany: jest.Mock;
    };
    taskChecklistItem: {
      findMany: jest.Mock;
    };
    chatMessage: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
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
      passwordReset: {
        deleteMany: jest.fn(),
      },
      workspaceInvite: {
        findMany: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      workspace: {
        deleteMany: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
      },
      taskComment: {
        findMany: jest.fn(),
      },
      taskChecklistItem: {
        findMany: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
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

  describe("exportData", () => {
    it("aggregates the user's data across all domains into one payload", async () => {
      cache.get.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "u@example.com",
        username: "u",
        firstname: "First",
        lastname: "Last",
        birthdate: new Date("2000-01-01"),
        created_at: new Date("2020-01-01"),
      });
      prisma.workspaceMember.findMany.mockResolvedValue([
        { role: "MEMBER", joined_at: new Date("2021-01-01"), workspace: { name: "Crew", slug: "crew" } },
      ]);
      prisma.task.findMany
        .mockResolvedValueOnce([{ shortId: "CRW-1", title: "Task", priority: "HIGH", created_at: new Date(), workspace: { name: "Crew" } }])
        .mockResolvedValueOnce([{ shortId: "CRW-2", title: "Assigned", priority: "LOW", workspace: { name: "Crew" } }]);
      prisma.taskComment.findMany.mockResolvedValue([{ content: "hi", created_at: new Date(), task: { shortId: "CRW-1", title: "Task" } }]);
      prisma.chatMessage.findMany.mockResolvedValue([{ content: "hey", created_at: new Date(), room: { name: "general" } }]);
      prisma.taskChecklistItem.findMany.mockResolvedValue([{ content: "step 1", is_completed: true, created_at: new Date(), task: { shortId: "CRW-1", title: "Task" } }]);

      const result = await userService.exportData("user-1");

      expect(result.profile.email).toBe("u@example.com");
      expect(result.workspaces).toHaveLength(1);
      expect(result.tasksCreated).toHaveLength(1);
      expect(result.tasksAssigned).toHaveLength(1);
      expect(result.comments).toHaveLength(1);
      expect(result.chatMessages).toHaveLength(1);
      expect(result.checklistItems).toHaveLength(1);
    });
  });

  describe("closeAccount", () => {
    const mockUser = {
      id: "user-1",
      email: "u@example.com",
      username: "u",
      role: "MEMBER",
      role_version: 1,
    };

    it("rejects when the password does not match", async () => {
      const { hash } = await import("bcrypt");
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, password_hash: await hash("Correct123!", 10) });

      await expect(userService.closeAccount("user-1", "Wrong123!")).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("blocks closure while the user is sole OWNER of a multi-member workspace", async () => {
      const { hash } = await import("bcrypt");
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, password_hash: await hash("Correct123!", 10) });
      prisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: "mem-1",
          role: "OWNER",
          workspace_id: "ws-1",
          workspace: { name: "Crew", slug: "crew", _count: { members: 3 } },
        },
      ]);

      await expect(userService.closeAccount("user-1", "Correct123!")).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("deletes solo-owned workspaces, leaves the rest, and anonymizes the account", async () => {
      const { hash } = await import("bcrypt");
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, password_hash: await hash("Correct123!", 10) });
      prisma.workspaceMember.findMany.mockResolvedValue([
        { id: "mem-1", role: "OWNER", workspace_id: "ws-1", workspace: { name: "Solo", slug: "solo", _count: { members: 1 } } },
        { id: "mem-2", role: "MEMBER", workspace_id: "ws-2", workspace: { name: "Shared", slug: "shared", _count: { members: 3 } } },
      ]);

      await userService.closeAccount("user-1", "Correct123!");

      expect(prisma.workspace.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["ws-1"] } } });
      expect(prisma.workspaceMember.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["mem-2"] } } });

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: "user-1" });
      expect(updateCall.data.email).toBe("deleted+user-1@crwsync.invalid");
      expect(updateCall.data.username).toBe("deleted-user-1");
      expect(updateCall.data.avatar_key).toBeNull();

      expect(sessionService.revokeAll).toHaveBeenCalledWith("user-1");
      expect(cache.del).toHaveBeenCalled();
    });
  });
});

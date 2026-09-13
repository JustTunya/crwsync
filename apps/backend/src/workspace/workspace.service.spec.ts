import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { WorkspaceRoleEnum } from "@prisma/client";
import { WorkspaceInviteStatusEnum } from "@crwsync/types";
import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";
import { NotificationService } from "src/notification/notification.service";

describe("WorkspaceService", () => {
  let service: WorkspaceService;
  let prisma: {
    workspace: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    workspaceMember: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    workspaceInvite: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    task: { findFirst: jest.Mock; update: jest.Mock; count: jest.Mock };
    taskAttachment: { findFirst: jest.Mock; create: jest.Mock; delete: jest.Mock };
    taskComment: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    taskActivity: { findMany: jest.Mock };
    taskChecklistItem: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    chatRoom: { findFirst: jest.Mock };
    fileRoom: { findFirst: jest.Mock };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let statusGateway: { server: { to: jest.Mock }; emitInviteReceived: jest.Mock; emitInviteHandled: jest.Mock };
  let storageService: {
    deleteObject: jest.Mock;
    presignFileGet: jest.Mock;
    presignFileUpload: jest.Mock;
    deleteFileObject: jest.Mock;
  };
  let notificationService: { create: jest.Mock };
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    prisma = {
      workspace: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspaceInvite: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      task: { findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      taskAttachment: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
      taskComment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      taskActivity: { findMany: jest.fn() },
      taskChecklistItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      chatRoom: { findFirst: jest.fn() },
      fileRoom: { findFirst: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
      $queryRaw: jest.fn(),
    };
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    statusGateway = {
      server: { to: jest.fn().mockReturnValue({ emit }) },
      emitInviteReceived: jest.fn(),
      emitInviteHandled: jest.fn(),
    };
    storageService = {
      deleteObject: jest.fn(),
      presignFileGet: jest.fn(),
      presignFileUpload: jest.fn(),
      deleteFileObject: jest.fn(),
    };
    notificationService = { create: jest.fn() };

    service = new WorkspaceService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      statusGateway as unknown as StatusGateway,
      storageService as unknown as StorageService,
      notificationService as unknown as NotificationService,
    );
  });

  describe("getMembers", () => {
    it("sorts members by role priority then by name", async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([
        { role: WorkspaceRoleEnum.MEMBER, user: { firstname: "Bob", lastname: "Z" } },
        { role: WorkspaceRoleEnum.OWNER, user: { firstname: "Amy", lastname: "A" } },
        { role: WorkspaceRoleEnum.MEMBER, user: { firstname: "Alice", lastname: "A" } },
      ]);

      const result = await service.getMembers("ws-1");

      expect(result.map((m) => m.user.firstname)).toEqual(["Amy", "Alice", "Bob"]);
    });
  });

  describe("createWorkspace", () => {
    it("generates a slug and multi-word key when none is provided", async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);
      prisma.workspace.create.mockResolvedValue({ id: "ws-1", name: "Acme Corp" });

      const result = await service.createWorkspace("user-1", { name: "Acme Corp" });

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: { name: "Acme Corp", slug: "acme-corp", workspaceKey: "AC" },
      });
      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: { user_id: "user-1", workspace_id: "ws-1", role: WorkspaceRoleEnum.OWNER },
      });
      expect(cache.del).toHaveBeenCalledWith("user:user-1:workspaces");
      expect(result).toEqual({ id: "ws-1", name: "Acme Corp" });
    });

    it("suffixes a random number when the derived slug is already taken", async () => {
      prisma.workspace.findUnique
        .mockResolvedValueOnce({ id: "existing" })
        .mockResolvedValueOnce(null);
      prisma.workspace.create.mockResolvedValue({ id: "ws-1" });

      await service.createWorkspace("user-1", { name: "Acme" });

      const createArgs = prisma.workspace.create.mock.calls[0][0];
      expect(createArgs.data.slug).toMatch(/^acme-\d+$/);
    });

    it("throws BadRequestException when an explicit slug is already taken", async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.createWorkspace("user-1", { name: "Acme", slug: "taken" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("falls back to consonants for a single ambiguous word and bumps the key on collision", async () => {
      prisma.workspace.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ workspaceKey: "STR" })
        .mockResolvedValueOnce(null);
      prisma.workspace.create.mockResolvedValue({ id: "ws-1" });

      await service.createWorkspace("user-1", { name: "Strategy" });

      const createArgs = prisma.workspace.create.mock.calls[0][0];
      expect(createArgs.data.workspaceKey).toBe("STR1");
    });

    it("uses the first three letters when a single word lacks enough consonants", async () => {
      prisma.workspace.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.workspace.create.mockResolvedValue({ id: "ws-1" });

      await service.createWorkspace("user-1", { name: "Aeiou" });

      const createArgs = prisma.workspace.create.mock.calls[0][0];
      expect(createArgs.data.workspaceKey).toBe("AEI");
    });

    it("falls back to WS when the name yields no usable characters", async () => {
      prisma.workspace.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.workspace.create.mockResolvedValue({ id: "ws-1" });

      await service.createWorkspace("user-1", { name: "!!!" });

      const createArgs = prisma.workspace.create.mock.calls[0][0];
      expect(createArgs.data.workspaceKey).toBe("WS");
    });
  });

  describe("findAllUserWorkspaces", () => {
    it("returns cached workspaces without hitting the database", async () => {
      cache.get.mockResolvedValue([{ id: "cached" }]);

      const result = await service.findAllUserWorkspaces("user-1");

      expect(result).toEqual([{ id: "cached" }]);
      expect(prisma.workspaceMember.findMany).not.toHaveBeenCalled();
    });

    it("fetches, caches, and returns workspaces on a cache miss", async () => {
      cache.get.mockResolvedValue(null);
      prisma.workspaceMember.findMany.mockResolvedValue([{ workspace: { id: "ws-1" } }]);

      const result = await service.findAllUserWorkspaces("user-1");

      expect(cache.set).toHaveBeenCalledWith(
        "user:user-1:workspaces",
        [{ workspace: { id: "ws-1" } }],
        600,
      );
      expect(result).toEqual([{ workspace: { id: "ws-1" } }]);
    });
  });

  describe("findOne", () => {
    it("returns the cached workspace when present", async () => {
      cache.get.mockResolvedValue({ id: "ws-1" });

      const result = await service.findOne("ws-1");

      expect(result).toEqual({ id: "ws-1" });
      expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the workspace does not exist", async () => {
      cache.get.mockResolvedValue(null);
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findOne("ws-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("fetches and caches the workspace on a cache miss", async () => {
      cache.get.mockResolvedValue(null);
      prisma.workspace.findUnique.mockResolvedValue({ id: "ws-1" });

      const result = await service.findOne("ws-1");

      expect(cache.set).toHaveBeenCalledWith("workspace:ws-1", { id: "ws-1" }, 600);
      expect(result).toEqual({ id: "ws-1" });
    });
  });

  describe("findBySlug", () => {
    it("returns the cached workspace when present", async () => {
      cache.get.mockResolvedValue({ id: "ws-1", slug: "acme" });

      const result = await service.findBySlug("acme");

      expect(result).toEqual({ id: "ws-1", slug: "acme" });
      expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the workspace does not exist", async () => {
      cache.get.mockResolvedValue(null);
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug("acme")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("fetches and caches the workspace on a cache miss", async () => {
      cache.get.mockResolvedValue(null);
      prisma.workspace.findUnique.mockResolvedValue({ id: "ws-1", slug: "acme" });

      const result = await service.findBySlug("acme");

      expect(cache.set).toHaveBeenCalledWith("workspace:slug:acme", { id: "ws-1", slug: "acme" }, 600);
      expect(result).toEqual({ id: "ws-1", slug: "acme" });
    });
  });

  describe("update", () => {
    it("throws BadRequestException when the logo key does not belong to the workspace", async () => {
      await expect(
        service.update("ws-1", { logo_key: "other-id_logo.png" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws BadRequestException when the new slug is already taken", async () => {
      prisma.workspace.findUnique
        .mockResolvedValueOnce({ slug: "old", logo_key: null })
        .mockResolvedValueOnce({ id: "other-ws" });
      prisma.workspaceMember.findMany.mockResolvedValue([]);

      await expect(
        service.update("ws-1", { slug: "new-slug" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("updates the workspace, deletes the old logo, and invalidates member caches", async () => {
      prisma.workspace.findUnique.mockResolvedValueOnce({ slug: "old", logo_key: "ws-1_old.png" });
      prisma.workspaceMember.findMany.mockResolvedValue([{ user_id: "user-1" }, { user_id: "user-2" }]);
      prisma.workspace.update.mockResolvedValue({ id: "ws-1", logo_key: "ws-1_new.png" });

      const result = await service.update("ws-1", { logo_key: "ws-1_new.png" });

      expect(storageService.deleteObject).toHaveBeenCalledWith("ws-1_old.png");
      expect(cache.del).toHaveBeenCalledWith([
        "workspace:ws-1",
        "workspace:slug:old",
        "workspace:ws-1:member:user-1",
        "user:user-1:workspaces",
        "workspace:ws-1:member:user-2",
        "user:user-2:workspaces",
      ]);
      expect(result).toEqual({ id: "ws-1", logo_key: "ws-1_new.png" });
    });

    it("does not delete the logo when it did not change", async () => {
      prisma.workspace.findUnique.mockResolvedValueOnce({ slug: "old", logo_key: "ws-1_same.png" });
      prisma.workspaceMember.findMany.mockResolvedValue([]);
      prisma.workspace.update.mockResolvedValue({ id: "ws-1" });

      await service.update("ws-1", { logo_key: "ws-1_same.png" });

      expect(storageService.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes the workspace and invalidates every member's caches", async () => {
      prisma.workspace.findUnique.mockResolvedValue({ slug: "acme" });
      prisma.workspaceMember.findMany.mockResolvedValue([{ user_id: "user-1" }]);
      prisma.workspace.delete.mockResolvedValue({ id: "ws-1" });

      const result = await service.remove("ws-1");

      expect(prisma.workspace.delete).toHaveBeenCalledWith({ where: { id: "ws-1" } });
      expect(cache.del).toHaveBeenCalledWith([
        "workspace:ws-1",
        "workspace:slug:acme",
        "workspace:ws-1:member:user-1",
        "user:user-1:workspaces",
      ]);
      expect(result).toEqual({ id: "ws-1" });
    });
  });

  describe("getPendingInvites", () => {
    it("lists pending invites for the workspace", async () => {
      prisma.workspaceInvite.findMany.mockResolvedValue([{ id: "invite-1" }]);

      const result = await service.getPendingInvites("ws-1");

      expect(prisma.workspaceInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspace_id: "ws-1", status: WorkspaceInviteStatusEnum.PENDING } }),
      );
      expect(result).toEqual([{ id: "invite-1" }]);
    });
  });

  describe("sendInvite", () => {
    const dto = { invitee_id: "user-2", role: WorkspaceRoleEnum.MEMBER };

    it("throws NotFoundException when the invitee does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.sendInvite("ws-1", "user-1", dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the invitee is already a member", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "member-1" });

      await expect(service.sendInvite("ws-1", "user-1", dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws BadRequestException when a pending invite already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      prisma.workspaceInvite.findUnique.mockResolvedValue({
        id: "invite-1",
        status: WorkspaceInviteStatusEnum.PENDING,
      });

      await expect(service.sendInvite("ws-1", "user-1", dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("revives a previously declined invite instead of creating a new one", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      prisma.workspaceInvite.findUnique.mockResolvedValue({
        id: "invite-1",
        status: WorkspaceInviteStatusEnum.DECLINED,
      });
      prisma.workspaceInvite.update.mockResolvedValue({ id: "invite-1", status: WorkspaceInviteStatusEnum.PENDING });

      const result = await service.sendInvite("ws-1", "user-1", dto);

      expect(prisma.workspaceInvite.update).toHaveBeenCalledWith({
        where: { id: "invite-1" },
        data: { status: WorkspaceInviteStatusEnum.PENDING, role: dto.role, creator_id: "user-1" },
      });
      expect(prisma.workspaceInvite.create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: "invite-1", status: WorkspaceInviteStatusEnum.PENDING });
    });

    it("creates a new invite and emits invite-received when none existed", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      prisma.workspaceInvite.findUnique.mockResolvedValue(null);
      const invite = { id: "invite-1", invitee_id: "user-2" };
      prisma.workspaceInvite.create.mockResolvedValue(invite);

      const result = await service.sendInvite("ws-1", "user-1", dto);

      expect(statusGateway.emitInviteReceived).toHaveBeenCalledWith("user-2", invite);
      expect(result).toEqual(invite);
    });
  });

  describe("revokeInvite", () => {
    it("throws NotFoundException when there is no pending invite", async () => {
      prisma.workspaceInvite.findFirst.mockResolvedValue(null);

      await expect(service.revokeInvite("ws-1", "invite-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("deletes the invite and emits invite-handled as REVOKED", async () => {
      prisma.workspaceInvite.findFirst.mockResolvedValue({ id: "invite-1", invitee_id: "user-2" });
      prisma.workspaceInvite.delete.mockResolvedValue({ id: "invite-1" });

      const result = await service.revokeInvite("ws-1", "invite-1");

      expect(statusGateway.emitInviteHandled).toHaveBeenCalledWith("user-2", "invite-1", "REVOKED");
      expect(prisma.workspaceInvite.delete).toHaveBeenCalledWith({ where: { id: "invite-1" } });
      expect(result).toEqual({ id: "invite-1" });
    });
  });

  describe("acceptInvite", () => {
    it("throws NotFoundException when there is no pending invite", async () => {
      prisma.workspaceInvite.findFirst.mockResolvedValue(null);

      await expect(service.acceptInvite("ws-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates a membership, marks the invite accepted, and invalidates caches", async () => {
      prisma.workspaceInvite.findFirst.mockResolvedValue({ id: "invite-1", role: WorkspaceRoleEnum.MEMBER });
      prisma.workspace.findUnique.mockResolvedValue({ slug: "acme" });

      await service.acceptInvite("ws-1", "user-1");

      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: { user_id: "user-1", workspace_id: "ws-1", role: WorkspaceRoleEnum.MEMBER },
      });
      expect(prisma.workspaceInvite.update).toHaveBeenCalledWith({
        where: { id: "invite-1" },
        data: { status: WorkspaceInviteStatusEnum.ACCEPTED },
      });
      expect(statusGateway.emitInviteHandled).toHaveBeenCalledWith(
        "user-1",
        "invite-1",
        WorkspaceInviteStatusEnum.ACCEPTED,
      );
      expect(cache.del).toHaveBeenCalled();
    });
  });

  describe("declineInvite", () => {
    it("throws NotFoundException when there is no pending invite", async () => {
      prisma.workspaceInvite.findFirst.mockResolvedValue(null);

      await expect(service.declineInvite("ws-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("marks the invite declined and emits invite-handled", async () => {
      prisma.workspaceInvite.findFirst.mockResolvedValue({ id: "invite-1" });
      prisma.workspaceInvite.update.mockResolvedValue({ id: "invite-1", status: WorkspaceInviteStatusEnum.DECLINED });

      const result = await service.declineInvite("ws-1", "user-1");

      expect(statusGateway.emitInviteHandled).toHaveBeenCalledWith(
        "user-1",
        "invite-1",
        WorkspaceInviteStatusEnum.DECLINED,
      );
      expect(result).toEqual({ id: "invite-1", status: WorkspaceInviteStatusEnum.DECLINED });
    });
  });

  describe("kickMember", () => {
    it("throws NotFoundException when the target is not a member", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.kickMember("ws-1", "user-2")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when trying to kick the owner", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.OWNER });

      await expect(service.kickMember("ws-1", "user-2")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("removes the member and invalidates membership caches", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.MEMBER });
      prisma.workspaceMember.delete.mockResolvedValue({ id: "m-1" });
      prisma.workspace.findUnique.mockResolvedValue({ slug: "acme" });

      const result = await service.kickMember("ws-1", "user-2");

      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
      expect(result).toEqual({ id: "m-1" });
    });
  });

  describe("leaveWorkspace", () => {
    it("throws NotFoundException when the user is not a member", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.leaveWorkspace("ws-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the owner tries to leave", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.OWNER });

      await expect(service.leaveWorkspace("ws-1", "user-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("removes the membership for a non-owner", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.MEMBER });
      prisma.workspaceMember.delete.mockResolvedValue({ id: "m-1" });
      prisma.workspace.findUnique.mockResolvedValue({ slug: "acme" });

      const result = await service.leaveWorkspace("ws-1", "user-1");

      expect(result).toEqual({ id: "m-1" });
    });
  });

  describe("updateMemberRole", () => {
    it("throws BadRequestException when assigning OWNER directly", async () => {
      await expect(
        service.updateMemberRole("ws-1", "user-2", WorkspaceRoleEnum.OWNER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws NotFoundException when the target is not a member", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole("ws-1", "user-2", WorkspaceRoleEnum.ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the target member is the owner", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.OWNER });

      await expect(
        service.updateMemberRole("ws-1", "user-2", WorkspaceRoleEnum.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("updates the member's role and invalidates membership caches", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.MEMBER });
      prisma.workspaceMember.update.mockResolvedValue({ id: "m-1", role: WorkspaceRoleEnum.ADMIN });
      prisma.workspace.findUnique.mockResolvedValue({ slug: "acme" });

      const result = await service.updateMemberRole("ws-1", "user-2", WorkspaceRoleEnum.ADMIN);

      expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: { role: WorkspaceRoleEnum.ADMIN },
      });
      expect(result).toEqual({ id: "m-1", role: WorkspaceRoleEnum.ADMIN });
    });
  });

  describe("transferOwnership", () => {
    it("throws NotFoundException when the new owner is not a member", async () => {
      prisma.workspaceMember.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.transferOwnership("ws-1", "user-1", "user-2"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the requester is not the current owner", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "m-2", role: WorkspaceRoleEnum.MEMBER })
        .mockResolvedValueOnce({ id: "m-1", role: WorkspaceRoleEnum.ADMIN });

      await expect(
        service.transferOwnership("ws-1", "user-1", "user-2"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("swaps roles between the current and new owner", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "m-2", role: WorkspaceRoleEnum.MEMBER })
        .mockResolvedValueOnce({ id: "m-1", role: WorkspaceRoleEnum.OWNER });
      prisma.workspace.findUnique.mockResolvedValue({ slug: "acme" });

      await service.transferOwnership("ws-1", "user-1", "user-2");

      expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: { role: WorkspaceRoleEnum.ADMIN },
      });
      expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { id: "m-2" },
        data: { role: WorkspaceRoleEnum.OWNER },
      });
    });
  });

  describe("getStatistics", () => {
    it("defaults to a 30-day interval and aggregates workload, velocity, cycle time, and timeline", async () => {
      prisma.task.count.mockResolvedValueOnce(3).mockResolvedValueOnce(5);
      prisma.$queryRaw.mockResolvedValueOnce([{ avg_seconds: 120 }]).mockResolvedValueOnce([{ date: "2026-01-01", count: 2 }]);

      const result = await service.getStatistics("ws-1", "user-1");

      expect(result).toEqual({
        personalWorkload: 3,
        personalVelocity: 5,
        personalCycleTime: 120,
        velocityTimeline: [{ date: "2026-01-01", count: 2 }],
      });
    });

    it("maps a known interval string to its day count and handles a null cycle time", async () => {
      prisma.task.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.$queryRaw.mockResolvedValueOnce([{ avg_seconds: null }]).mockResolvedValueOnce([]);

      const result = await service.getStatistics("ws-1", "user-1", "1w");

      expect(result.personalCycleTime).toBeNull();
    });
  });

  describe("deleteTask", () => {
    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.deleteTask("ws-1", "task-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("soft-deletes the task and emits board:task:deleted", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1" } });

      const result = await service.deleteTask("ws-1", "task-1");

      expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: "task-1" }, data: { is_deleted: true } });
      expect(emit).toHaveBeenCalledWith("board:task:deleted", { boardId: "board-1", taskId: "task-1" });
      expect(result).toEqual({ success: true });
    });
  });

  describe("archiveTask", () => {
    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.archiveTask("ws-1", "task-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the task's column is not COMPLETE", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1", type: "ONGOING" } });

      await expect(service.archiveTask("ws-1", "task-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("archives the task and emits board:task:updated", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1", type: "COMPLETE" } });
      const updated = { id: "task-1", is_archived: true };
      prisma.task.update.mockResolvedValue(updated);

      const result = await service.archiveTask("ws-1", "task-1");

      expect(emit).toHaveBeenCalledWith("board:task:updated", {
        boardId: "board-1",
        taskId: "task-1",
        data: { is_archived: true },
      });
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe("getTaskAttachmentDownloadUrl", () => {
    it("throws NotFoundException when no attachment, chat room, or file room matches the key", async () => {
      prisma.taskAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.getTaskAttachmentDownloadUrl("ws-1", "not-a-uuid_file.png", "user-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when the key belongs to a DM room the requester is not part of", async () => {
      const roomId = "11111111-1111-1111-1111-111111111111";
      prisma.taskAttachment.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue({
        id: roomId,
        is_direct: true,
        dm_user_a_id: "user-2",
        dm_user_b_id: "user-3",
      });
      prisma.fileRoom.findFirst.mockResolvedValue(null);

      await expect(
        service.getTaskAttachmentDownloadUrl("ws-1", `${roomId}_file.png`, "user-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("presigns download for a chat room attachment when the chat room is not direct", async () => {
      const roomId = "11111111-1111-1111-1111-111111111111";
      prisma.taskAttachment.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue({
        id: roomId,
        is_direct: false,
      });
      prisma.fileRoom.findFirst.mockResolvedValue(null);
      storageService.presignFileGet.mockResolvedValue("https://signed-chat-url");

      const result = await service.getTaskAttachmentDownloadUrl("ws-1", `${roomId}_file.png`, "user-1");

      expect(storageService.presignFileGet).toHaveBeenCalledWith(`${roomId}_file.png`);
      expect(result).toBe("https://signed-chat-url");
    });

    it("presigns download for a file room attachment", async () => {
      const roomId = "11111111-1111-1111-1111-111111111111";
      prisma.taskAttachment.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue(null);
      prisma.fileRoom.findFirst.mockResolvedValue({ id: roomId });
      storageService.presignFileGet.mockResolvedValue("https://signed-file-room-url");

      const result = await service.getTaskAttachmentDownloadUrl("ws-1", `${roomId}_file.png`, "user-1");

      expect(storageService.presignFileGet).toHaveBeenCalledWith(`${roomId}_file.png`);
      expect(result).toBe("https://signed-file-room-url");
    });

    it("presigns download when user is dm_user_a or dm_user_b", async () => {
      const roomId = "11111111-1111-1111-1111-111111111111";
      prisma.taskAttachment.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue({
        id: roomId,
        is_direct: true,
        dm_user_a_id: "user-1",
        dm_user_b_id: "user-2",
      });
      prisma.fileRoom.findFirst.mockResolvedValue(null);
      storageService.presignFileGet.mockResolvedValue("https://signed-dm-url");

      const result = await service.getTaskAttachmentDownloadUrl("ws-1", `${roomId}_file.png`, "user-1");

      expect(result).toBe("https://signed-dm-url");
    });
  });

  describe("presignTaskAttachment", () => {
    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.presignTaskAttachment("ws-1", "task-1", "image/png", "file.png"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns a presigned upload for a valid task", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1" });
      storageService.presignFileUpload.mockResolvedValue({ url: "https://upload", key: "task-1_file.png" });

      const result = await service.presignTaskAttachment("ws-1", "task-1", "image/png", "file.png");

      expect(storageService.presignFileUpload).toHaveBeenCalledWith("image/png", "file.png", "task-1");
      expect(result).toEqual({ url: "https://upload", key: "task-1_file.png" });
    });
  });

  describe("createTaskAttachment", () => {
    const dto = { key: "task-1_file.png", file_name: "file.png", file_size: 10, mime_type: "image/png" };

    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskAttachment("ws-1", "task-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the attachment key does not belong to the task", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1" } });

      await expect(
        service.createTaskAttachment("ws-1", "task-1", "user-1", { ...dto, key: "other-task_file.png" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates the attachment and emits task:attachment:added", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1" } });
      const attachment = { id: "att-1", key: dto.key };
      prisma.taskAttachment.create.mockResolvedValue(attachment);

      const result = await service.createTaskAttachment("ws-1", "task-1", "user-1", dto);

      expect(emit).toHaveBeenCalledWith("task:attachment:added", {
        boardId: "board-1",
        taskId: "task-1",
        attachment,
      });
      expect(result).toEqual({ success: true, data: attachment });
    });
  });

  describe("deleteTaskAttachment", () => {
    it("throws NotFoundException when the attachment does not resolve", async () => {
      prisma.taskAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTaskAttachment("ws-1", "task-1", "att-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("deletes the attachment from storage and db, then emits task:attachment:removed", async () => {
      prisma.taskAttachment.findFirst.mockResolvedValue({
        id: "att-1",
        key: "task-1_file.png",
        task: { column: { board_id: "board-1" } },
      });

      const result = await service.deleteTaskAttachment("ws-1", "task-1", "att-1");

      expect(prisma.taskAttachment.delete).toHaveBeenCalledWith({ where: { id: "att-1" } });
      expect(storageService.deleteFileObject).toHaveBeenCalledWith("task-1_file.png");
      expect(emit).toHaveBeenCalledWith("task:attachment:removed", {
        boardId: "board-1",
        taskId: "task-1",
        attachmentId: "att-1",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("listTaskActivity", () => {
    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.listTaskActivity("ws-1", "task-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns activity in chronological order with has_more false under the page size", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1" });
      const newest = { id: "a2", created_at: new Date("2026-01-02") };
      const oldest = { id: "a1", created_at: new Date("2026-01-01") };
      prisma.taskActivity.findMany.mockResolvedValue([newest, oldest]);

      const result = await service.listTaskActivity("ws-1", "task-1");

      expect(result).toEqual({
        success: true,
        data: { activities: [oldest, newest], next_cursor: null, has_more: false },
      });
    });

    it("sets has_more and next_cursor when there is an extra page", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1" });
      const a3 = { id: "a3", created_at: new Date("2026-01-03") };
      const a2 = { id: "a2", created_at: new Date("2026-01-02") };
      const extra = { id: "a1", created_at: new Date("2026-01-01") };
      prisma.taskActivity.findMany.mockResolvedValue([a3, a2, extra]);

      const result = await service.listTaskActivity("ws-1", "task-1", undefined, 2);

      expect(result.data.has_more).toBe(true);
      expect(result.data.next_cursor).toBe(a2.created_at.toISOString());
    });
  });

  describe("createTaskComment", () => {
    const dto = { content: "hello @Bob", mentionedUserIds: ["user-2"] };

    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskComment("ws-1", "task-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates the comment, emits task:comment:created, and notifies mentioned users", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: {
          board_id: "board-1",
          board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } },
        },
      });
      const comment = { id: "comment-1", task_id: "task-1", author_id: "user-1", content: dto.content };
      prisma.taskComment.create.mockResolvedValue(comment);
      prisma.taskComment.count.mockResolvedValue(1);
      prisma.workspaceMember.findMany.mockResolvedValue([{ user_id: "user-2" }]);

      const result = await service.createTaskComment("ws-1", "task-1", "user-1", dto);

      expect(result).toEqual({ success: true, data: comment });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:created",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", comment, commentCount: 1 }),
      );
      expect(notificationService.create).toHaveBeenCalledWith("user-2", "ws-1", "TASK_COMMENT_MENTION", expect.any(Object));
    });

    it("does not notify the author if they mention themselves", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: { board_id: "board-1", board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } } },
      });
      prisma.taskComment.create.mockResolvedValue({ id: "comment-1" });
      prisma.taskComment.count.mockResolvedValue(1);
      prisma.workspaceMember.findMany.mockResolvedValue([{ user_id: "user-1" }]);

      await service.createTaskComment("ws-1", "task-1", "user-1", { content: "note to self", mentionedUserIds: ["user-1"] });

      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it("does not notify or connect a mentioned user who is not a workspace member", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: { board_id: "board-1", board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } } },
      });
      prisma.taskComment.create.mockResolvedValue({ id: "comment-1" });
      prisma.taskComment.count.mockResolvedValue(1);
      prisma.workspaceMember.findMany.mockResolvedValue([]);

      await service.createTaskComment("ws-1", "task-1", "user-1", { content: "hi @outsider", mentionedUserIds: ["user-99"] });

      expect(prisma.taskComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.not.objectContaining({ mentions: expect.anything() }) }),
      );
      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });

  describe("listTaskComments", () => {
    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.listTaskComments("ws-1", "task-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns comments in chronological order with has_more false when under the page size", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1" });
      const newest = { id: "c2", created_at: new Date("2026-01-02") };
      const oldest = { id: "c1", created_at: new Date("2026-01-01") };
      prisma.taskComment.findMany.mockResolvedValue([newest, oldest]);

      const result = await service.listTaskComments("ws-1", "task-1");

      expect(result).toEqual({
        success: true,
        data: { comments: [oldest, newest], next_cursor: null, has_more: false },
      });
    });

    it("sets has_more and next_cursor when there are more comments than the page size", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1" });
      const c3 = { id: "c3", created_at: new Date("2026-01-03") };
      const c2 = { id: "c2", created_at: new Date("2026-01-02") };
      const extra = { id: "c1", created_at: new Date("2026-01-01") };
      prisma.taskComment.findMany.mockResolvedValue([c3, c2, extra]);

      const result = await service.listTaskComments("ws-1", "task-1", undefined, 2);

      expect(result.data.has_more).toBe(true);
      expect(result.data.comments).toEqual([c2, c3]);
      expect(result.data.next_cursor).toBe(c2.created_at.toISOString());
    });
  });

  describe("updateTaskComment", () => {
    const dto = { content: "edited" };

    it("throws NotFoundException when the comment does not resolve", async () => {
      prisma.taskComment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when the requester is not the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-2",
        task: { column: { board_id: "board-1" } },
      });

      await expect(
        service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("updates the comment and emits task:comment:updated when the requester is the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-1",
        task: { column: { board_id: "board-1" } },
      });
      const updated = { id: "comment-1", content: "edited", is_edited: true };
      prisma.taskComment.update.mockResolvedValue(updated);

      const result = await service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto);

      expect(result).toEqual({ success: true, data: updated });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:updated",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", comment: updated }),
      );
    });
  });

  describe("deleteTaskComment", () => {
    it("throws NotFoundException when the comment does not resolve", async () => {
      prisma.taskComment.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when the requester is not the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-2",
        task: { column: { board_id: "board-1" } },
      });

      await expect(
        service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("soft-deletes the comment and emits task:comment:deleted with the fresh count", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-1",
        task: { column: { board_id: "board-1" } },
      });
      prisma.taskComment.count.mockResolvedValue(0);

      const result = await service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1");

      expect(result).toEqual({ success: true });
      expect(prisma.taskComment.update).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: { is_deleted: true, content: "This comment was deleted." },
      });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:deleted",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", commentId: "comment-1", commentCount: 0 }),
      );
    });
  });

  describe("createTaskChecklistItem", () => {
    const dto = { content: "Write tests" };

    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskChecklistItem("ws-1", "task-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("positions the item after existing items and emits task:checklist:created", async () => {
      prisma.task.findFirst.mockResolvedValue({ id: "task-1", column: { board_id: "board-1" } });
      prisma.taskChecklistItem.count.mockResolvedValue(2);
      const item = { id: "item-1", task_id: "task-1", content: dto.content, position: 2 };
      prisma.taskChecklistItem.create.mockResolvedValue(item);

      const result = await service.createTaskChecklistItem("ws-1", "task-1", "user-1", dto);

      expect(prisma.taskChecklistItem.create).toHaveBeenCalledWith({
        data: { task_id: "task-1", content: dto.content, created_by: "user-1", position: 2 },
      });
      expect(result).toEqual({ success: true, data: item });
      expect(emit).toHaveBeenCalledWith(
        "task:checklist:created",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", item }),
      );
    });
  });

  describe("updateTaskChecklistItem", () => {
    const dto = { is_completed: true, content: "Updated content" };

    it("throws NotFoundException when the item does not resolve", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaskChecklistItem("ws-1", "task-1", "item-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("updates the item and emits task:checklist:updated", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue({
        id: "item-1",
        task: { column: { board_id: "board-1" } },
      });
      const updated = { id: "item-1", is_completed: true, content: "Updated content" };
      prisma.taskChecklistItem.update.mockResolvedValue(updated);

      const result = await service.updateTaskChecklistItem("ws-1", "task-1", "item-1", dto);

      expect(prisma.taskChecklistItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { is_completed: true, content: "Updated content" },
      });
      expect(result).toEqual({ success: true, data: updated });
      expect(emit).toHaveBeenCalledWith(
        "task:checklist:updated",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", item: updated }),
      );
    });
  });

  describe("deleteTaskChecklistItem", () => {
    it("throws NotFoundException when the item does not resolve", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTaskChecklistItem("ws-1", "task-1", "item-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("deletes the item and emits task:checklist:deleted", async () => {
      prisma.taskChecklistItem.findFirst.mockResolvedValue({
        id: "item-1",
        task: { column: { board_id: "board-1" } },
      });

      const result = await service.deleteTaskChecklistItem("ws-1", "task-1", "item-1");

      expect(result).toEqual({ success: true });
      expect(prisma.taskChecklistItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
      expect(emit).toHaveBeenCalledWith(
        "task:checklist:deleted",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", itemId: "item-1" }),
      );
    });
  });
});

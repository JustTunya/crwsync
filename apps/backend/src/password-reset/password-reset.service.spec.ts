import { NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { compare } from "bcrypt";
import { PasswordResetService } from "./password-reset.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionService } from "src/session/session.service";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { PasswordResetStatus } from "@crwsync/types";

describe("PasswordResetService", () => {
  let service: PasswordResetService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    passwordReset: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let sessionService: { revokeAll: jest.Mock };
  let config: { get: jest.Mock };
  let emailQueue: { add: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      passwordReset: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    sessionService = { revokeAll: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue("http://localhost:3000") };
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) };

    service = new PasswordResetService(
      prisma as unknown as PrismaService,
      sessionService as unknown as SessionService,
      config as unknown as ConfigService,
      emailQueue as unknown as Queue,
    );
  });

  describe("create", () => {
    it("throws NotFoundException when no user has the given email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.create({ email: "missing@example.com" })).rejects.toThrow(NotFoundException);
      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it("clears pending resets, creates a new one, and queues the reset email", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      const created = { id: "pr-1", email: "user@example.com" };
      prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
      prisma.passwordReset.create.mockResolvedValue(created);

      const result = await service.create({ email: "user@example.com" });

      expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: { email: "user@example.com", status: PasswordResetStatus.PENDING },
      });
      expect(emailQueue.add).toHaveBeenCalledWith(
        "send-password-reset",
        expect.objectContaining({ to: "user@example.com", template: "reset-password" }),
      );
      expect(result).toEqual(created);
    });
  });

  it("findAll delegates to prisma", async () => {
    const rows = [{ id: "pr-1" }];
    prisma.passwordReset.findMany.mockResolvedValue(rows);
    await expect(service.findAll()).resolves.toEqual(rows);
  });

  describe("findOne", () => {
    it("throws NotFoundException when missing", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.findOne("pr-1")).rejects.toThrow(NotFoundException);
    });

    it("returns the record when found", async () => {
      const record = { id: "pr-1" };
      prisma.passwordReset.findUnique.mockResolvedValue(record);
      await expect(service.findOne("pr-1")).resolves.toEqual(record);
    });
  });

  describe("findByEmail", () => {
    it("throws NotFoundException when missing", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.findByEmail("missing@example.com")).rejects.toThrow(NotFoundException);
    });

    it("returns the record when found", async () => {
      const record = { id: "pr-1", email: "user@example.com" };
      prisma.passwordReset.findUnique.mockResolvedValue(record);
      await expect(service.findByEmail("user@example.com")).resolves.toEqual(record);
    });
  });

  describe("findByToken", () => {
    it("hashes the token and throws NotFoundException when missing", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.findByToken("raw-token")).rejects.toThrow(NotFoundException);

      const expectedHash = createHash("sha256").update("raw-token").digest("hex");
      expect(prisma.passwordReset.findUnique).toHaveBeenCalledWith({
        where: { token_hash: expectedHash },
        select: expect.anything(),
      });
    });

    it("returns the record when found", async () => {
      const record = { id: "pr-1" };
      prisma.passwordReset.findUnique.mockResolvedValue(record);
      await expect(service.findByToken("raw-token")).resolves.toEqual(record);
    });
  });

  describe("update", () => {
    it("throws NotFoundException when missing", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.update("pr-1", { email: "x@example.com" })).rejects.toThrow(NotFoundException);
      expect(prisma.passwordReset.update).not.toHaveBeenCalled();
    });

    it("updates the record when found", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({ id: "pr-1" });
      const updated = { id: "pr-1", email: "new@example.com" };
      prisma.passwordReset.update.mockResolvedValue(updated);

      const result = await service.update("pr-1", { email: "new@example.com" });

      expect(result).toEqual(updated);
    });
  });

  describe("remove", () => {
    it("throws NotFoundException when missing", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.remove("pr-1")).rejects.toThrow(NotFoundException);
      expect(prisma.passwordReset.delete).not.toHaveBeenCalled();
    });

    it("deletes the record when found", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({ id: "pr-1" });
      await service.remove("pr-1");
      expect(prisma.passwordReset.delete).toHaveBeenCalledWith({ where: { id: "pr-1" } });
    });
  });

  describe("reset", () => {
    it("throws NotFoundException when the reset has no user_id", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        user_id: null,
        status: PasswordResetStatus.PENDING,
        expires_at: new Date(Date.now() + 60_000),
      });

      await expect(service.reset({ token: "raw-token", newPassword: "NewPassword123!" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when the reset is not pending", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        user_id: "user-1",
        status: PasswordResetStatus.USED,
        expires_at: new Date(Date.now() + 60_000),
      });

      await expect(service.reset({ token: "raw-token", newPassword: "NewPassword123!" })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the reset has expired", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        user_id: "user-1",
        status: PasswordResetStatus.PENDING,
        expires_at: new Date(Date.now() - 60_000),
      });

      await expect(service.reset({ token: "raw-token", newPassword: "NewPassword123!" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when the user no longer exists", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        user_id: "user-1",
        status: PasswordResetStatus.PENDING,
        expires_at: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.reset({ token: "raw-token", newPassword: "NewPassword123!" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("hashes the new password, marks the reset used, and revokes other sessions", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        user_id: "user-1",
        status: PasswordResetStatus.PENDING,
        expires_at: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.$transaction.mockResolvedValue(undefined);

      await service.reset({ token: "raw-token", newPassword: "NewPassword123!" });

      const transactionArg = prisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(transactionArg)).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "user-1" } }),
      );
      const passwordHash = prisma.user.update.mock.calls[0][0].data.password_hash;
      await expect(compare("NewPassword123!", passwordHash)).resolves.toBe(true);

      expect(prisma.passwordReset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pr-1" },
          data: expect.objectContaining({ status: PasswordResetStatus.USED }),
        }),
      );
      expect(sessionService.revokeAll).toHaveBeenCalledWith("user-1");
    });
  });

  describe("getTokenStatus", () => {
    it("marks an expired pending reset as expired and persists the change", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        status: PasswordResetStatus.PENDING,
        expires_at: new Date(Date.now() - 60_000),
      });
      prisma.passwordReset.update.mockResolvedValue({});

      const result = await service.getTokenStatus("raw-token");

      expect(prisma.passwordReset.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PasswordResetStatus.EXPIRED }) }),
      );
      expect(result).toEqual({ status: PasswordResetStatus.EXPIRED });
    });

    it("returns the current status when not expired", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: "pr-1",
        status: PasswordResetStatus.PENDING,
        expires_at: new Date(Date.now() + 60_000),
      });

      const result = await service.getTokenStatus("raw-token");

      expect(prisma.passwordReset.update).not.toHaveBeenCalled();
      expect(result).toEqual({ status: PasswordResetStatus.PENDING });
    });

    it("propagates NotFoundException when the token does not resolve", async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.getTokenStatus("raw-token")).rejects.toThrow(NotFoundException);
    });
  });
});

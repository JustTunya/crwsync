import { BadRequestException, NotFoundException } from "@nestjs/common";
import { VerificationService } from "./email-verification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { MailVerificationStatus } from "@crwsync/types";

describe("VerificationService.findByEmail", () => {
  let service: VerificationService;
  let prisma: {
    emailVerification: {
      findUnique: jest.Mock;
    };
  };
  let cache: { del: jest.Mock };

  beforeEach(() => {
    prisma = {
      emailVerification: {
        findUnique: jest.fn(),
      },
    };
    cache = { del: jest.fn() };
    service = new VerificationService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      cache as unknown as CacheService,
      {} as unknown as Queue,
    );
  });

  it("returns null when no record matches email without throwing", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);

    const result = await service.findByEmail("nonexistent@example.com");
    expect(result).toBeNull();
  });

  it("returns the verification record when found", async () => {
    const record = { id: "v-1", email: "exists@example.com", status: "pending" };
    prisma.emailVerification.findUnique.mockResolvedValue(record);

    const result = await service.findByEmail("exists@example.com");
    expect(result).toEqual(record);
  });
});

describe("VerificationService.verifyEmail", () => {
  let service: VerificationService;
  let prisma: {
    emailVerification: { findUnique: jest.Mock; update: jest.Mock };
    user: { update: jest.Mock };
    $transaction: jest.Mock;
  };
  let cache: { del: jest.Mock };

  beforeEach(() => {
    prisma = {
      emailVerification: { findUnique: jest.fn(), update: jest.fn() },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    cache = { del: jest.fn() };
    service = new VerificationService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      cache as unknown as CacheService,
      {} as unknown as Queue,
    );
  });

  it("invalidates the user cache after verifying", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      user_id: "user-1",
      status: MailVerificationStatus.PENDING,
      expires_at: new Date(Date.now() + 60_000),
    });

    await service.verifyEmail("raw-token");

    expect(cache.del).toHaveBeenCalledWith(expect.stringContaining("user-1"));
  });

  it("throws NotFoundException when no verification matches the token", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.verifyEmail("raw-token")).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException when the verification is not pending", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      user_id: "user-1",
      status: MailVerificationStatus.VERIFIED,
      expires_at: new Date(Date.now() + 60_000),
    });

    await expect(service.verifyEmail("raw-token")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("marks an expired verification as expired and throws NotFoundException", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      user_id: "user-1",
      status: MailVerificationStatus.PENDING,
      expires_at: new Date(Date.now() - 60_000),
    });

    await expect(service.verifyEmail("raw-token")).rejects.toThrow(NotFoundException);
    expect(prisma.emailVerification.update).toHaveBeenCalledWith({
      where: { id: "v-1" },
      data: { status: MailVerificationStatus.EXPIRED },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the verification has no linked user", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      user_id: null,
      status: MailVerificationStatus.PENDING,
      expires_at: new Date(Date.now() + 60_000),
    });

    await expect(service.verifyEmail("raw-token")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("VerificationService.create", () => {
  let service: VerificationService;
  let prisma: {
    user: { findFirst: jest.Mock };
    emailVerification: { deleteMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let emailQueue: { add: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn() },
      emailVerification: { deleteMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new VerificationService(
      prisma as unknown as PrismaService,
      { get: jest.fn().mockReturnValue("http://localhost:3000") } as unknown as ConfigService,
      { del: jest.fn() } as unknown as CacheService,
      emailQueue as unknown as Queue,
    );
  });

  it("throws NotFoundException when no matching user exists", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.create({ user_id: "user-1", email: "user@example.com" })).rejects.toThrow(
      NotFoundException,
    );
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when the user already verified their email", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "user-1", email_verified_at: new Date() });
    await expect(service.create({ user_id: "user-1", email: "user@example.com" })).rejects.toThrow(
      BadRequestException,
    );
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it("clears pending verifications, creates a new one, and queues the email", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "user-1", email_verified_at: null });
    const created = { id: "v-1", email: "user@example.com" };
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
    prisma.emailVerification.create.mockResolvedValue(created);

    const result = await service.create({ user_id: "user-1", email: "user@example.com" });

    expect(prisma.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { email: "user@example.com", status: MailVerificationStatus.PENDING },
    });
    expect(emailQueue.add).toHaveBeenCalledWith(
      "send-verification",
      expect.objectContaining({ to: "user@example.com", template: "email-verification" }),
    );
    expect(result).toEqual(created);
  });
});

describe("VerificationService.findOne / findByToken / update / remove", () => {
  let service: VerificationService;
  let prisma: {
    emailVerification: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      emailVerification: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    };
    service = new VerificationService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      { del: jest.fn() } as unknown as CacheService,
      {} as unknown as Queue,
    );
  });

  it("findAll delegates to prisma", async () => {
    const rows = [{ id: "v-1" }];
    prisma.emailVerification.findMany.mockResolvedValue(rows);
    await expect(service.findAll()).resolves.toEqual(rows);
  });

  it("findOne throws NotFoundException when missing", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.findOne("v-1")).rejects.toThrow(NotFoundException);
  });

  it("findOne returns the record when found", async () => {
    const record = { id: "v-1" };
    prisma.emailVerification.findUnique.mockResolvedValue(record);
    await expect(service.findOne("v-1")).resolves.toEqual(record);
  });

  it("findByToken throws NotFoundException when missing", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.findByToken("raw-token")).rejects.toThrow(NotFoundException);
  });

  it("findByToken returns the record when found", async () => {
    const record = { id: "v-1" };
    prisma.emailVerification.findUnique.mockResolvedValue(record);
    await expect(service.findByToken("raw-token")).resolves.toEqual(record);
  });

  it("update throws NotFoundException when missing", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.update("v-1", { email: "x@example.com" })).rejects.toThrow(NotFoundException);
    expect(prisma.emailVerification.update).not.toHaveBeenCalled();
  });

  it("update connects a new user when user_id is provided", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({ id: "v-1" });
    prisma.emailVerification.update.mockResolvedValue({ id: "v-1" });

    await service.update("v-1", { user_id: "user-2", email: "new@example.com" });

    expect(prisma.emailVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "new@example.com", user: { connect: { id: "user-2" } } }),
      }),
    );
  });

  it("update omits the user connect when user_id is not provided", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({ id: "v-1" });
    prisma.emailVerification.update.mockResolvedValue({ id: "v-1" });

    await service.update("v-1", { email: "new@example.com" });

    const updateCall = prisma.emailVerification.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("user");
  });

  it("remove throws NotFoundException when missing", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.remove("v-1")).rejects.toThrow(NotFoundException);
    expect(prisma.emailVerification.delete).not.toHaveBeenCalled();
  });

  it("remove deletes the record when found", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({ id: "v-1" });
    await service.remove("v-1");
    expect(prisma.emailVerification.delete).toHaveBeenCalledWith({ where: { id: "v-1" } });
  });
});

describe("VerificationService.getTokenStatus", () => {
  let service: VerificationService;
  let prisma: { emailVerification: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { emailVerification: { findUnique: jest.fn() } };
    service = new VerificationService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      { del: jest.fn() } as unknown as CacheService,
      {} as unknown as Queue,
    );
  });

  it("throws NotFoundException when the token does not resolve", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.getTokenStatus("raw-token")).rejects.toThrow(NotFoundException);
  });

  it("reports EXPIRED when the record is past its expiry, without persisting a change", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      status: MailVerificationStatus.PENDING,
      expires_at: new Date(Date.now() - 60_000),
    });

    const result = await service.getTokenStatus("raw-token");
    expect(result).toEqual({ status: MailVerificationStatus.EXPIRED });
  });

  it("reports the stored status when not expired", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      status: MailVerificationStatus.PENDING,
      expires_at: new Date(Date.now() + 60_000),
    });

    const result = await service.getTokenStatus("raw-token");
    expect(result).toEqual({ status: MailVerificationStatus.PENDING });
  });
});

describe("VerificationService.resendToken", () => {
  let service: VerificationService;
  let prisma: {
    emailVerification: { findUnique: jest.Mock; update: jest.Mock; deleteMany: jest.Mock; create: jest.Mock };
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let emailQueue: { add: jest.Mock };

  beforeEach(() => {
    prisma = {
      emailVerification: { findUnique: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new VerificationService(
      prisma as unknown as PrismaService,
      { get: jest.fn().mockReturnValue("http://localhost:3000") } as unknown as ConfigService,
      { del: jest.fn() } as unknown as CacheService,
      emailQueue as unknown as Queue,
    );
  });

  it("throws NotFoundException when the token does not resolve", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.resendToken("raw-token")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when already verified", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      status: MailVerificationStatus.VERIFIED,
      user_id: "user-1",
      email: "user@example.com",
    });

    await expect(service.resendToken("raw-token")).rejects.toThrow(BadRequestException);
    expect(prisma.emailVerification.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the verification has no linked user or email", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      status: MailVerificationStatus.PENDING,
      user_id: null,
      email: "user@example.com",
    });

    await expect(service.resendToken("raw-token")).rejects.toThrow(NotFoundException);
    expect(prisma.emailVerification.update).not.toHaveBeenCalled();
  });

  it("revokes the old token and issues a fresh one on success", async () => {
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: "v-1",
      status: MailVerificationStatus.PENDING,
      user_id: "user-1",
      email: "user@example.com",
    });
    prisma.emailVerification.update.mockResolvedValue({});
    prisma.user.findFirst.mockResolvedValue({ id: "user-1", email_verified_at: null });
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
    prisma.emailVerification.create.mockResolvedValue({ id: "v-2" });

    const result = await service.resendToken("raw-token");

    expect(prisma.emailVerification.update).toHaveBeenCalledWith({
      where: { id: "v-1" },
      data: { status: MailVerificationStatus.REVOKED },
    });
    expect(emailQueue.add).toHaveBeenCalledWith(
      "send-verification",
      expect.objectContaining({ to: "user@example.com" }),
    );
    expect(result).toEqual({ success: true, message: "Verification token resent successfully" });
  });
});

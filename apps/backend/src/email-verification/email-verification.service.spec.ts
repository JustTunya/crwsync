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
});

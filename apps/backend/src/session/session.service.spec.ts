import { UnauthorizedException } from "@nestjs/common";
import { SessionService } from "./session.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import type { Request } from "express";

function makeService() {
  const prisma = {
    user: { findUnique: jest.fn() },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SessionService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
  );
  return { service, prisma, cache };
}

const req = { headers: {}, ip: "127.0.0.1" } as unknown as Request;

describe("SessionService.create (family_id defaulting)", () => {
  it("defaults family_id to the session's own id when not supplied", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.session.create.mockImplementation(({ data }) => ({
      id: data.id,
      user_id: data.user.connect.id,
      family_id: data.family_id,
      persistent: data.persistent,
      created_at: data.created_at,
      expires_at: data.expires_at,
      revoked_at: null,
      ua: data.ua,
      ip: data.ip,
    }));

    const { session } = await service.create({ id: "session-1", user_id: "user-1" }, req);

    expect((session as { family_id?: string }).family_id).toBe("session-1");
  });

  it("uses the supplied family_id when provided", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.session.create.mockImplementation(({ data }) => ({
      id: data.id,
      family_id: data.family_id,
    }));

    const { session } = await service.create(
      { id: "session-2", user_id: "user-1", family_id: "family-root" },
      req,
    );

    expect((session as { family_id?: string }).family_id).toBe("family-root");
  });
});

describe("SessionService.rotate (family_id propagation + reuse detection)", () => {
  it("propagates the old session's family_id and user_id to the newly rotated session", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "old-session",
      user_id: "user-1",
      family_id: "family-root",
      persistent: false,
      expires_at: null,
      revoked_at: null,
    });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.session.create.mockImplementation(({ data }) => ({
      id: data.id,
      user_id: data.user.connect.id,
      family_id: data.family_id,
      persistent: data.persistent,
    }));

    const { session } = await service.rotate(
      { old_token: "raw-token" },
      req,
    );

    expect((session as { family_id?: string; user_id?: string }).family_id).toBe("family-root");
    expect((session as { family_id?: string; user_id?: string }).user_id).toBe("user-1");
  });

  it("revokes the entire session family and throws Unauthorized when the token was already rotated", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "old-session",
      user_id: "user-1",
      family_id: "family-root",
      persistent: false,
      expires_at: null,
      revoked_at: null,
    });
    prisma.session.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.session.findMany.mockResolvedValue([{ id: "sibling-1" }, { id: "sibling-2" }]);
    prisma.session.updateMany.mockResolvedValueOnce({ count: 2 });

    await expect(
      service.rotate({ user_id: "user-1", old_token: "raw-token", persistent: false }, req),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ family_id: "family-root" }) }),
    );
    expect(cache.del).toHaveBeenCalledWith(["session:sibling-1", "session:sibling-2"]);
  });
});

describe("SessionService.revokeFamily", () => {
  it("revokes every unrevoked session in the family and invalidates their cache entries", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    prisma.session.updateMany.mockResolvedValue({ count: 2 });

    await service.revokeFamily("family-root");

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { family_id: "family-root", revoked_at: null },
      data: { revoked_at: expect.any(Date) },
    });
    expect(cache.del).toHaveBeenCalledWith(["session:a", "session:b"]);
  });

  it("does not call cache.del when the family has no active sessions", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findMany.mockResolvedValue([]);
    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await service.revokeFamily("empty-family");

    expect(cache.del).not.toHaveBeenCalled();
  });
});

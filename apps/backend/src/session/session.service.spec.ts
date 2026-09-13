import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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

describe("SessionService.create (validation and expiry)", () => {
  it("throws NotFoundException and never creates a session when the user does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.create({ id: "s1", user_id: "missing-user" }, req)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it("sets a ~30 day expiry when persistent and ~7 day expiry otherwise", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: "u1" });
    prisma.session.create.mockImplementation(({ data }) => ({ expires_at: data.expires_at }));

    const emptyReq = { headers: {} } as unknown as Request;
    const { session: persistent } = await service.create({ id: "s1", user_id: "u1", persistent: true }, emptyReq);
    const { session: temporary } = await service.create({ id: "s2", user_id: "u1", persistent: false }, req);

    const persistentDays = (persistent.expires_at!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    const temporaryDays = (temporary.expires_at!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);

    expect(persistentDays).toBeGreaterThan(29);
    expect(temporaryDays).toBeLessThan(8);
  });
});

describe("SessionService.findAll / findAllByUser", () => {
  it("findAll returns every session", async () => {
    const { service, prisma } = makeService();
    prisma.session.findMany.mockResolvedValue([{ id: "a" }]);

    const result = await service.findAll();

    expect(result).toEqual([{ id: "a" }]);
  });

  it("findAllByUser queries only active sessions for that user, newest first", async () => {
    const { service, prisma } = makeService();
    prisma.session.findMany.mockResolvedValue([{ id: "a" }]);

    await service.findAllByUser("user-1");

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "user-1", revoked_at: null },
        orderBy: { created_at: "desc" },
      }),
    );
  });
});

describe("SessionService.findOne (cache)", () => {
  it("returns the cached session without querying prisma", async () => {
    const { service, prisma, cache } = makeService();
    cache.get.mockResolvedValue({ id: "s1" });

    const result = await service.findOne("s1");

    expect(result).toEqual({ id: "s1" });
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("queries prisma and caches the result on a cache miss", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findUnique.mockResolvedValue({ id: "s1" });

    const result = await service.findOne("s1");

    expect(result).toEqual({ id: "s1" });
    expect(cache.set).toHaveBeenCalledWith("session:s1", { id: "s1" }, expect.anything());
  });

  it("throws NotFoundException when the session does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });
});

describe("SessionService.update", () => {
  it("throws NotFoundException when the session does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(service.update("missing", { persistent: true })).rejects.toThrow(NotFoundException);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it("connects a new user when user_id is provided and invalidates the cache", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findUnique.mockResolvedValue({ id: "s1" });
    prisma.session.update.mockResolvedValue({ id: "s1", persistent: true });

    await service.update("s1", { persistent: true, user_id: "user-2" });

    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { persistent: true, user: { connect: { id: "user-2" } } },
      }),
    );
    expect(cache.del).toHaveBeenCalledWith("session:s1");
  });

  it("omits the user connect when user_id is not provided", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue({ id: "s1" });
    prisma.session.update.mockResolvedValue({ id: "s1", persistent: false });

    await service.update("s1", { persistent: false });

    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { persistent: false } }),
    );
  });
});

describe("SessionService.remove", () => {
  it("throws NotFoundException when the session does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(service.remove("missing")).rejects.toThrow(NotFoundException);
    expect(prisma.session.delete).not.toHaveBeenCalled();
  });

  it("deletes the session and invalidates its cache entry", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findUnique.mockResolvedValue({ id: "s1" });

    await service.remove("s1");

    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(cache.del).toHaveBeenCalledWith("session:s1");
  });
});

describe("SessionService.verify", () => {
  it("throws UnauthorizedException when no session matches the token hash", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue(null);

    await expect(service.verify({ token: "raw-token" })).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the session has expired", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "s1",
      expires_at: new Date(Date.now() - 1000),
      revoked_at: null,
    });

    await expect(service.verify({ token: "raw-token" })).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the session has been revoked", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "s1",
      expires_at: null,
      revoked_at: new Date(),
    });

    await expect(service.verify({ token: "raw-token" })).rejects.toThrow(UnauthorizedException);
  });

  it("returns the session when it is active and unexpired", async () => {
    const { service, prisma } = makeService();
    const session = { id: "s1", expires_at: null, revoked_at: null };
    prisma.session.findFirst.mockResolvedValue(session);

    await expect(service.verify({ token: "raw-token" })).resolves.toEqual(session);
  });
});

describe("SessionService.rotate (additional branches)", () => {
  it("throws NotFoundException when the old session cannot be found", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue(null);

    await expect(service.rotate({ old_token: "raw-token" }, req)).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when the old session has expired", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "old-session",
      user_id: "user-1",
      family_id: "family-root",
      persistent: false,
      expires_at: new Date(Date.now() - 1000),
      revoked_at: null,
    });

    await expect(service.rotate({ old_token: "raw-token" }, req)).rejects.toThrow(BadRequestException);
  });
});

describe("SessionService.revoke", () => {
  it("marks the session revoked and invalidates its cache entry", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    await service.revoke("s1");

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { revoked_at: expect.any(Date) },
    });
    expect(cache.del).toHaveBeenCalledWith("session:s1");
  });
});

describe("SessionService.revokeOwned", () => {
  it("throws NotFoundException when the session does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(service.revokeOwned("user-1", "s1")).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException when the session belongs to a different user", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue({ user_id: "someone-else" });

    await expect(service.revokeOwned("user-1", "s1")).rejects.toThrow(NotFoundException);
  });

  it("revokes the session when it belongs to the requesting user", async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue({ user_id: "user-1" });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    await service.revokeOwned("user-1", "s1");

    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1" } }),
    );
  });
});

describe("SessionService.revokeAll", () => {
  it("excludes the given session id from the revoke query", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findMany.mockResolvedValue([{ id: "other-1" }]);
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    await service.revokeAll("user-1", "current-session");

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: { user_id: "user-1", revoked_at: null, id: { not: "current-session" } },
      select: { id: true },
    });
    expect(cache.del).toHaveBeenCalledWith(["session:other-1"]);
  });

  it("does not call cache.del when there are no active sessions to revoke", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findMany.mockResolvedValue([]);
    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await service.revokeAll("user-1");

    expect(cache.del).not.toHaveBeenCalled();
  });
});

describe("SessionService.purge methods", () => {
  it("purgeExpired deletes sessions past their expiry", async () => {
    const { service, prisma } = makeService();
    prisma.session.deleteMany.mockResolvedValue({ count: 3 });

    await service.purgeExpired();

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { expires_at: { lt: expect.any(Date) } },
    });
  });

  it("purgeRevoked deletes sessions revoked before the cutoff", async () => {
    const { service, prisma } = makeService();
    const cutoff = new Date("2024-01-01");
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });

    await service.purgeRevoked(cutoff);

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { revoked_at: { lt: cutoff } },
    });
  });

  it("purgeAll deletes every session", async () => {
    const { service, prisma } = makeService();
    prisma.session.deleteMany.mockResolvedValue({ count: 5 });

    await service.purgeAll();

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({});
  });
});

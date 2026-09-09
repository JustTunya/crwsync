import { CacheService } from "./cache.service";
import { ConfigService } from "@nestjs/config";

describe("CacheService.acquireLock (Cluster 3 fail-closed)", () => {
  let cacheService: CacheService;
  let mockRedis: {
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    mockRedis = {
      set: jest.fn(),
      del: jest.fn(),
    };

    cacheService = new CacheService({
      get: jest.fn().mockReturnValue("crwsync:"),
    } as unknown as ConfigService);

    // Assign mocked redis client
    (cacheService as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  });

  it("returns false (fail-closed) when Redis throws an error", async () => {
    mockRedis.set.mockRejectedValue(new Error("Redis connection refused"));

    const result = await cacheService.acquireLock("test-lock", 5);

    expect(result).toBe(false);
  });

  it("returns true when lock is successfully acquired", async () => {
    mockRedis.set.mockResolvedValue("OK");

    const result = await cacheService.acquireLock("test-lock", 5);

    expect(result).toBe(true);
  });

  it("returns false when lock is already held by another worker", async () => {
    mockRedis.set.mockResolvedValue(null);

    const result = await cacheService.acquireLock("test-lock", 5);

    expect(result).toBe(false);
  });
});

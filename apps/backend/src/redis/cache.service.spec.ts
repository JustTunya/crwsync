import { CacheService } from "./cache.service";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

jest.mock("ioredis");

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

  it("releaseLock deletes the lock key", async () => {
    mockRedis.del.mockResolvedValue(1);

    await cacheService.releaseLock("test-lock");

    expect(mockRedis.del).toHaveBeenCalledWith("test-lock");
  });
});

describe("CacheService.get/set/del", () => {
  let cacheService: CacheService;
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    cacheService = new CacheService({
      get: jest.fn().mockReturnValue("crwsync:"),
    } as unknown as ConfigService);

    (cacheService as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  });

  it("get returns the parsed value on a cache hit", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ foo: "bar" }));

    const result = await cacheService.get<{ foo: string }>("some-key");

    expect(result).toEqual({ foo: "bar" });
  });

  it("get returns null on a cache miss", async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await cacheService.get("missing-key");

    expect(result).toBeNull();
  });

  it("get returns null when the stored value is malformed JSON", async () => {
    mockRedis.get.mockResolvedValue("{not-json");

    const result = await cacheService.get("bad-key");

    expect(result).toBeNull();
  });

  it("get returns null when redis throws", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis connection refused"));

    const result = await cacheService.get("some-key");

    expect(result).toBeNull();
  });

  it("set stores the value with the default ttl", async () => {
    mockRedis.set.mockResolvedValue("OK");

    await cacheService.set("some-key", { foo: "bar" });

    expect(mockRedis.set).toHaveBeenCalledWith("some-key", JSON.stringify({ foo: "bar" }), "EX", 600);
  });

  it("set stores the value with a custom ttl", async () => {
    mockRedis.set.mockResolvedValue("OK");

    await cacheService.set("some-key", { foo: "bar" }, 30);

    expect(mockRedis.set).toHaveBeenCalledWith("some-key", JSON.stringify({ foo: "bar" }), "EX", 30);
  });

  it("set swallows errors from redis", async () => {
    mockRedis.set.mockRejectedValue(new Error("Redis connection refused"));

    await expect(cacheService.set("some-key", { foo: "bar" })).resolves.toBeUndefined();
  });

  it("del does nothing for an empty key array", async () => {
    await cacheService.del([]);

    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it("del wraps a single string key into an array call", async () => {
    mockRedis.del.mockResolvedValue(1);

    await cacheService.del("single-key");

    expect(mockRedis.del).toHaveBeenCalledWith("single-key");
  });

  it("del forwards an array of keys", async () => {
    mockRedis.del.mockResolvedValue(2);

    await cacheService.del(["key-a", "key-b"]);

    expect(mockRedis.del).toHaveBeenCalledWith("key-a", "key-b");
  });

  it("del swallows errors from redis", async () => {
    mockRedis.del.mockRejectedValue(new Error("Redis connection refused"));

    await expect(cacheService.del("some-key")).resolves.toBeUndefined();
  });
});

describe("CacheService.invalidatePattern", () => {
  let cacheService: CacheService;
  let mockRedis: {
    scan: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    mockRedis = {
      scan: jest.fn(),
      del: jest.fn(),
    };

    cacheService = new CacheService({
      get: jest.fn().mockReturnValue("crwsync:"),
    } as unknown as ConfigService);

    (cacheService as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  });

  it("deletes all keys found in a single scan iteration", async () => {
    mockRedis.scan.mockResolvedValue(["0", ["crwsync:workspace:1", "crwsync:workspace:2"]]);
    mockRedis.del.mockResolvedValue(2);

    await cacheService.invalidatePattern("workspace:*");

    expect(mockRedis.del).toHaveBeenCalledWith("workspace:1", "workspace:2");
  });

  it("accumulates keys across multiple scan cursor iterations", async () => {
    mockRedis.scan
      .mockResolvedValueOnce(["1", ["crwsync:workspace:1"]])
      .mockResolvedValueOnce(["0", ["crwsync:workspace:2"]]);
    mockRedis.del.mockResolvedValue(2);

    await cacheService.invalidatePattern("workspace:*");

    expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    expect(mockRedis.del).toHaveBeenCalledWith("workspace:1", "workspace:2");
  });

  it("does not call del when no keys match", async () => {
    mockRedis.scan.mockResolvedValue(["0", []]);

    await cacheService.invalidatePattern("workspace:*");

    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it("swallows errors from redis", async () => {
    mockRedis.scan.mockRejectedValue(new Error("Redis connection refused"));

    await expect(cacheService.invalidatePattern("workspace:*")).resolves.toBeUndefined();
  });
});

describe("CacheService.isHealthy", () => {
  let cacheService: CacheService;
  let mockRedis: {
    ping: jest.Mock;
  };

  beforeEach(() => {
    mockRedis = {
      ping: jest.fn(),
    };

    cacheService = new CacheService({
      get: jest.fn().mockReturnValue("crwsync:"),
    } as unknown as ConfigService);

    (cacheService as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  });

  it("returns true when redis responds with PONG", async () => {
    mockRedis.ping.mockResolvedValue("PONG");

    await expect(cacheService.isHealthy()).resolves.toBe(true);
  });

  it("returns false when redis responds with anything else", async () => {
    mockRedis.ping.mockResolvedValue("WHAT");

    await expect(cacheService.isHealthy()).resolves.toBe(false);
  });

  it("returns false when redis throws", async () => {
    mockRedis.ping.mockRejectedValue(new Error("Redis connection refused"));

    await expect(cacheService.isHealthy()).resolves.toBe(false);
  });
});

describe("CacheService set operations", () => {
  let cacheService: CacheService;
  let mockRedis: {
    sadd: jest.Mock;
    srem: jest.Mock;
    scard: jest.Mock;
    smembers: jest.Mock;
    pipeline: jest.Mock;
  };

  beforeEach(() => {
    mockRedis = {
      sadd: jest.fn(),
      srem: jest.fn(),
      scard: jest.fn(),
      smembers: jest.fn(),
      pipeline: jest.fn(),
    };

    cacheService = new CacheService({
      get: jest.fn().mockReturnValue("crwsync:"),
    } as unknown as ConfigService);

    (cacheService as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  });

  it("sadd returns 0 when called with no members", async () => {
    const result = await cacheService.sadd("set-key");

    expect(result).toBe(0);
    expect(mockRedis.sadd).not.toHaveBeenCalled();
  });

  it("sadd forwards members and returns the added count", async () => {
    mockRedis.sadd.mockResolvedValue(2);

    const result = await cacheService.sadd("set-key", "a", "b");

    expect(result).toBe(2);
    expect(mockRedis.sadd).toHaveBeenCalledWith("set-key", "a", "b");
  });

  it("sadd returns 0 and swallows errors from redis", async () => {
    mockRedis.sadd.mockRejectedValue(new Error("Redis connection refused"));

    const result = await cacheService.sadd("set-key", "a");

    expect(result).toBe(0);
  });

  it("srem returns 0 when called with no members", async () => {
    const result = await cacheService.srem("set-key");

    expect(result).toBe(0);
    expect(mockRedis.srem).not.toHaveBeenCalled();
  });

  it("srem forwards members and returns the removed count", async () => {
    mockRedis.srem.mockResolvedValue(1);

    const result = await cacheService.srem("set-key", "a");

    expect(result).toBe(1);
    expect(mockRedis.srem).toHaveBeenCalledWith("set-key", "a");
  });

  it("srem returns 0 and swallows errors from redis", async () => {
    mockRedis.srem.mockRejectedValue(new Error("Redis connection refused"));

    const result = await cacheService.srem("set-key", "a");

    expect(result).toBe(0);
  });

  it("scard returns the cardinality from redis", async () => {
    mockRedis.scard.mockResolvedValue(3);

    const result = await cacheService.scard("set-key");

    expect(result).toBe(3);
  });

  it("scard returns 0 and swallows errors from redis", async () => {
    mockRedis.scard.mockRejectedValue(new Error("Redis connection refused"));

    const result = await cacheService.scard("set-key");

    expect(result).toBe(0);
  });

  it("smembers returns the members from redis", async () => {
    mockRedis.smembers.mockResolvedValue(["a", "b"]);

    const result = await cacheService.smembers("set-key");

    expect(result).toEqual(["a", "b"]);
  });

  it("smembers returns an empty array and swallows errors from redis", async () => {
    mockRedis.smembers.mockRejectedValue(new Error("Redis connection refused"));

    const result = await cacheService.smembers("set-key");

    expect(result).toEqual([]);
  });

  it("scardMulti returns an empty array for an empty key list", async () => {
    const result = await cacheService.scardMulti([]);

    expect(result).toEqual([]);
    expect(mockRedis.pipeline).not.toHaveBeenCalled();
  });

  it("scardMulti maps pipeline results in order, defaulting per-command errors to 0", async () => {
    const pipeline = {
      scard: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        [null, 2],
        [new Error("boom"), null],
      ]),
    };
    mockRedis.pipeline.mockReturnValue(pipeline);

    const result = await cacheService.scardMulti(["key-a", "key-b"]);

    expect(pipeline.scard).toHaveBeenCalledWith("key-a");
    expect(pipeline.scard).toHaveBeenCalledWith("key-b");
    expect(result).toEqual([2, 0]);
  });

  it("scardMulti returns zeros when the pipeline yields no results", async () => {
    const pipeline = {
      scard: jest.fn(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockRedis.pipeline.mockReturnValue(pipeline);

    const result = await cacheService.scardMulti(["key-a", "key-b"]);

    expect(result).toEqual([0, 0]);
  });

  it("scardMulti returns zeros and swallows errors thrown by the pipeline", async () => {
    mockRedis.pipeline.mockImplementation(() => {
      throw new Error("Redis connection refused");
    });

    const result = await cacheService.scardMulti(["key-a", "key-b"]);

    expect(result).toEqual([0, 0]);
  });
});

describe("CacheService.onModuleInit/onModuleDestroy", () => {
  let cacheService: CacheService;
  let mockRedisInstance: { on: jest.Mock; quit: jest.Mock };
  const RedisMock = Redis as unknown as jest.Mock;

  beforeEach(() => {
    mockRedisInstance = {
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue("OK"),
    };
    RedisMock.mockClear();
    RedisMock.mockImplementation(() => mockRedisInstance);
  });

  it("initializes redis with config-provided values and registers connect/error handlers", async () => {
    const configValues: Record<string, unknown> = {
      REDIS_KEY_PREFIX: "custom:",
      REDIS_HOST: "redis-host",
      REDIS_PORT: 1234,
      REDIS_USER: "user",
      REDIS_PASS: "pass",
      REDIS_DB: 2,
    };
    cacheService = new CacheService({
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService);

    await cacheService.onModuleInit();

    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "redis-host",
        port: 1234,
        username: "user",
        password: "pass",
        db: 2,
        keyPrefix: "custom:",
      }),
    );
    expect(mockRedisInstance.on).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockRedisInstance.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("falls back to defaults when optional config values are missing", async () => {
    cacheService = new CacheService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await cacheService.onModuleInit();

    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "localhost",
        port: 6379,
        username: undefined,
        password: undefined,
        db: 0,
        keyPrefix: "crwsync:",
      }),
    );
  });

  it("retryStrategy backs off linearly and gives up after 3 retries", async () => {
    cacheService = new CacheService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await cacheService.onModuleInit();

    const options = RedisMock.mock.calls[0][0] as { retryStrategy: (times: number) => number | null };

    expect(options.retryStrategy(1)).toBe(200);
    expect(options.retryStrategy(4)).toBeNull();
  });

  it("invokes the connect and error handlers without throwing", async () => {
    cacheService = new CacheService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await cacheService.onModuleInit();

    const connectHandler = mockRedisInstance.on.mock.calls.find(([event]) => event === "connect")?.[1];
    const errorHandler = mockRedisInstance.on.mock.calls.find(([event]) => event === "error")?.[1];

    expect(() => connectHandler()).not.toThrow();
    expect(() => errorHandler(new Error("boom"))).not.toThrow();
  });

  it("closes the redis connection when it exists", async () => {
    cacheService = new CacheService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await cacheService.onModuleInit();
    await cacheService.onModuleDestroy();

    expect(mockRedisInstance.quit).toHaveBeenCalled();
  });

  it("does nothing when redis was never initialized", async () => {
    cacheService = new CacheService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await expect(cacheService.onModuleDestroy()).resolves.toBeUndefined();
  });
});

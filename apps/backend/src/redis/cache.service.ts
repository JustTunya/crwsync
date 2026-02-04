import { ConfigService } from "@nestjs/config";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix: string;
  private redis!: Redis;

  constructor(private readonly config: ConfigService) {
    this.keyPrefix = this.config.get<string>("REDIS_KEY_PREFIX") || "crwsync:";
  }

  async onModuleInit() {
    const host = this.config.get<string>("REDIS_HOST") || "localhost";
    const port = this.config.get<number>("REDIS_PORT") || 6379;
    const username = this.config.get<string>("REDIS_USER") || undefined;
    const password = this.config.get<string>("REDIS_PASS") || undefined;
    const db = this.config.get<number>("REDIS_DB") || 0;

    this.redis = new Redis({
      host,
      port,
      username,
      password,
      db,
      keyPrefix: this.keyPrefix,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error("Redis connection failed after 3 retries");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on("connect", () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.redis.on("error", (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log("Redis connection closed");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 600): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}: ${error}`);
    }
  }

  async del(keys: string | string[]): Promise<void> {
    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      if (keyArray.length === 0) return;
      await this.redis.del(...keyArray);
    } catch (error) {
      this.logger.warn(`Cache del error: ${error}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = `${this.keyPrefix}${pattern}`;
      const keys: string[] = [];
      let cursor = "0";

      do {
        const [newCursor, foundKeys] = await this.redis.scan(cursor, "MATCH", fullPattern, "COUNT", 100);
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== "0");

      if (keys.length > 0) {
        const keysWithoutPrefix = keys.map((k) => k.replace(this.keyPrefix, ""));
        await this.redis.del(...keysWithoutPrefix);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.warn(`Cache invalidatePattern error for pattern ${pattern}: ${error}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }
}

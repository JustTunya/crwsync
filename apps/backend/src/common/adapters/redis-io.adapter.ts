import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";
import { INestApplicationContext } from "@nestjs/common";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>("REDIS_HOST");
    const port = this.configService.get<number>("REDIS_PORT");
    const username = this.configService.get<string>("REDIS_USER");
    const password = this.configService.get<string>("REDIS_PASS");
    const db = this.configService.get<number>("REDIS_DB");
    const keyPrefix = this.configService.get<string>("REDIS_KEY_PREFIX");

    const pubClient = new Redis({
      host,
      port,
      username,
      password,
      db,
      keyPrefix: `${keyPrefix}socket.io`,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

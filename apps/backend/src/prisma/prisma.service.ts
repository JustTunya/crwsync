import { INestApplication, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

type PrismaEvent = Prisma.LogLevel | "beforeExit";

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, PrismaEvent>
  implements OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const isProd = process.env.NODE_ENV === "production";
    const logQueries = !isProd && process.env.PRISMA_LOG_QUERY === "true";

    super({
      log: [
        ...(logQueries ? [{ emit: "event" as const, level: "query" as const }] : []),
        { emit: "event" as const, level: "warn" as const },
        { emit: "event" as const, level: "error" as const },
      ],
    });

    if (logQueries) {
      this.$on("query", (e: Prisma.QueryEvent) => {
        this.logger.debug(`${e.duration}ms ${e.query}`);
      });
    }

    this.$on("warn", (e: Prisma.LogEvent) => {
      this.logger.warn(e.message);
    });

    this.$on("error", (e: Prisma.LogEvent) => {
      this.logger.error(e.message);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    this.$on("beforeExit", async () => {
      this.logger.log("Prisma beforeExit received; closing Nest application...");
      await app.close();
    });

    const shutdown = async (signal: NodeJS.Signals) => {
      try {
        this.logger.log(`${signal} received; disconnecting Prisma...`);
        await this.$disconnect();
      } finally {
        await app.close();
      }
    };

    process.once("SIGTERM", () => void shutdown("SIGTERM"));
    process.once("SIGINT", () => void shutdown("SIGINT"));
  }
}

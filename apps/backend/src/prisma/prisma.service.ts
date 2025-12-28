import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
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

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("The connection string is missing.");
    }

    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
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

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

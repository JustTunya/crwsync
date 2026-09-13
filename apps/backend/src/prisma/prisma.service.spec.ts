import { Prisma, PrismaClient } from "@prisma/client";
import { Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

type OnHandler = (event: Prisma.LogEvent | Prisma.QueryEvent) => void;

function spyOnPrismaEvents(): Record<string, OnHandler> {
  const handlers: Record<string, OnHandler> = {};
  jest.spyOn(PrismaClient.prototype, "$on").mockImplementation(((event: string, cb: OnHandler) => {
    handlers[event] = cb;
  }) as unknown as typeof PrismaClient.prototype.$on);
  return handlers;
}

describe("PrismaService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://user:pass@localhost:5432/testdb?connection_limit=5&pool_timeout=5",
      NODE_ENV: "test",
      PRISMA_LOG_QUERY: undefined,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("throws when DATABASE_URL is not set", () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService()).toThrow("The connection string is missing.");
  });

  it("connects and disconnects via the module lifecycle hooks", async () => {
    const connectSpy = jest.spyOn(PrismaClient.prototype, "$connect").mockResolvedValue(undefined);
    const disconnectSpy = jest.spyOn(PrismaClient.prototype, "$disconnect").mockResolvedValue(undefined);
    const service = new PrismaService();

    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("logs warn and error events emitted by the underlying client", () => {
    const handlers = spyOnPrismaEvents();
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    new PrismaService();

    handlers.warn({ message: "slow query", timestamp: new Date(), target: "PrismaService" });
    handlers.error({ message: "query failed", timestamp: new Date(), target: "PrismaService" });

    expect(warnSpy).toHaveBeenCalledWith("slow query");
    expect(errorSpy).toHaveBeenCalledWith("query failed");
  });

  it("registers a query event listener that logs via debug when PRISMA_LOG_QUERY is enabled", () => {
    process.env.PRISMA_LOG_QUERY = "true";
    process.env.NODE_ENV = "development";

    const handlers = spyOnPrismaEvents();
    const debugSpy = jest.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);

    new PrismaService();

    handlers.query({ duration: 12, query: "SELECT 1", timestamp: new Date(), params: "[]", target: "PrismaService" });

    expect(debugSpy).toHaveBeenCalledWith("12ms SELECT 1");
  });
});

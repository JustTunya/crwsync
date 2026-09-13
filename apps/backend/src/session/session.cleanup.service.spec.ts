import { SessionCleanupService } from "./session.cleanup.service";
import { SessionService } from "src/session/session.service";
import { ConfigService } from "@nestjs/config";

describe("SessionCleanupService", () => {
  let service: SessionCleanupService;
  let sessionService: { purgeExpired: jest.Mock; purgeRevoked: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-10T00:00:00Z"));
    sessionService = { purgeExpired: jest.fn().mockResolvedValue(undefined), purgeRevoked: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn() };
    service = new SessionCleanupService(sessionService as unknown as SessionService, config as unknown as ConfigService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("purgeExpiredHourly", () => {
    it("delegates to sessionService.purgeExpired", async () => {
      await service.purgeExpiredHourly();

      expect(sessionService.purgeExpired).toHaveBeenCalledTimes(1);
    });
  });

  describe("purgeRevokedDaily", () => {
    it("purges revoked sessions older than the configured number of days", async () => {
      config.get.mockReturnValue(10);

      await service.purgeRevokedDaily();

      expect(sessionService.purgeRevoked).toHaveBeenCalledWith(new Date("2025-12-31T00:00:00Z"));
    });

    it("defaults to 30 days when PURGE_SESSIONS_DAYS is not configured", async () => {
      config.get.mockReturnValue(undefined);

      await service.purgeRevokedDaily();

      expect(sessionService.purgeRevoked).toHaveBeenCalledWith(new Date("2025-12-11T00:00:00Z"));
    });
  });
});

// apps/backend/src/session/session.cleanup.service.ts
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { SessionService } from "src/session/session.service";

@Injectable()
export class SessionCleanupService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly config: ConfigService,
  ) {}

  // Purges expired sessions every hour
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredHourly() {
    await this.sessionService.purgeExpired();
  }

  // Purges revoked sessions older than configured days every day at 3am
  @Cron("0 3 * * *")
  async purgeRevokedDaily() {
    const days = this.config.get<number>("PURGE_SESSIONS_DAYS") || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await this.sessionService.purgeRevoked(cutoff);
  }
}
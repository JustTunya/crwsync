import { Module } from "@nestjs/common";
import { SessionService } from "src/session/session.service";
import { SessionCleanupService } from "src/session/session.cleanup.service";
import { SessionController } from "src/session/session.controller";

@Module({
  providers: [SessionService, SessionCleanupService],
  controllers: [SessionController],
  exports: [SessionService, SessionCleanupService],
})
export class SessionModule {}

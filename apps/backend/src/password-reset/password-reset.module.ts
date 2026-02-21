import { Module } from "@nestjs/common";
import { PasswordResetService } from "src/password-reset/password-reset.service";
import { PasswordResetController } from "src/password-reset/password-reset.controller";
import { EmailModule } from "src/email/email.module";
import { SessionModule } from "src/session/session.module";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [EmailModule, SessionModule, BullModule],
  providers: [PasswordResetService],
  controllers: [PasswordResetController],
  exports: [PasswordResetService]
})
export class PasswordResetModule {}
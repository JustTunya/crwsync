import { Module } from "@nestjs/common";
import { PasswordResetService } from "src/password-reset/password-reset.service";
import { PasswordResetController } from "src/password-reset/password-reset.controller";
import { EmailModule } from "src/email/email.module";
import { SessionModule } from "src/session/session.module";

@Module({
  imports: [EmailModule, SessionModule],
  providers: [PasswordResetService],
  controllers: [PasswordResetController],
  exports: [PasswordResetService]
})
export class PasswordResetModule {}
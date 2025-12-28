import { Module } from "@nestjs/common";
import { VerificationService } from "src/email-verification/email-verification.service";
import { VerificationController } from "src/email-verification/email-verification.controller";
import { EmailModule } from "src/email/email.module";

@Module({
  imports: [EmailModule],
  providers: [VerificationService],
  controllers: [VerificationController],
  exports: [VerificationService]
})
export class VerificationModule {}
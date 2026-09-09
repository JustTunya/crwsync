import { Module } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { UserController } from "src/user/user.controller";
import { VerificationModule } from "src/email-verification/email-verification.module";
import { SessionModule } from "src/session/session.module";

@Module({
  imports: [VerificationModule, SessionModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
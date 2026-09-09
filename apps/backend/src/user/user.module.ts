import { Module } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { UserController } from "src/user/user.controller";
import { VerificationModule } from "src/email-verification/email-verification.module";

@Module({
  imports: [VerificationModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
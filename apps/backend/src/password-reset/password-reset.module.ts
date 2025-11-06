import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PasswordResetEntity } from "src/password-reset/password-reset.entity";
import { PasswordResetService } from "src/password-reset/password-reset.service";
import { PasswordResetController } from "src/password-reset/password-reset.controller";
import { UserEntity } from "src/user/user.entity";
import { EmailModule } from "src/email/email.module";
import { SessionModule } from "src/session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetEntity, UserEntity]),
    EmailModule,
    SessionModule
  ],
  providers: [PasswordResetService],
  controllers: [PasswordResetController],
  exports: [PasswordResetService]
})
export class PasswordResetModule {}
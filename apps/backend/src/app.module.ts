import { Module } from "@nestjs/common";
import { HealthModule } from "src/health/health.module";
import { DatabaseModule } from "src/database/database.module";
import { AppController } from "src/app.controller";
import { UserModule } from "src/user/user.module";
import { SessionModule } from "src/session/session.module";
import { AuthModule } from "src/auth/auth.module";
import { AppService } from "src/app.service";
import { VerificationModule } from "src/email-verification/email-verification.module";
import { PasswordResetModule } from "src/password-reset/password-reset.module";
import { EmailModule } from "src/email/email.module";

@Module({
  imports: [
    HealthModule, 
    DatabaseModule, 
    UserModule,
    SessionModule,
    AuthModule, 
    EmailModule,
    VerificationModule,
    PasswordResetModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

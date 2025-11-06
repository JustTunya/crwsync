import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot(),
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

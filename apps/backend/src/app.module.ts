import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
// MODULES
import { VerificationModule } from "src/email-verification/email-verification.module";
import { PasswordResetModule } from "src/password-reset/password-reset.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { SessionModule } from "src/session/session.module";
import { HealthModule } from "src/health/health.module";
import { EmailModule } from "src/email/email.module";
import { AppController } from "src/app.controller";
import { UserModule } from "src/user/user.module";
import { AuthModule } from "src/auth/auth.module";
import { AppService } from "src/app.service";
// GUARDS
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 100 }, // 100 requests per minute
      { name: "auth", ttl: 60_000, limit: 10 }  // 10 requests per minute
    ]),
    HealthModule, 
    PrismaModule, 
    UserModule,
    SessionModule,
    AuthModule, 
    EmailModule,
    VerificationModule,
    PasswordResetModule,
    WorkspaceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

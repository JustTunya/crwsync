import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
// MODULES
import { VerificationModule } from "src/email-verification/email-verification.module";
import { PasswordResetModule } from "src/password-reset/password-reset.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { RedisModule } from "src/redis/redis.module";
import { SessionModule } from "src/session/session.module";
import { HealthModule } from "src/health/health.module";
import { EmailModule } from "src/email/email.module";
import { WorkspaceModule } from "src/workspace/workspace.module";
import { StatusModule } from "src/status/status.module";
import { UserModule } from "src/user/user.module";
import { AuthModule } from "src/auth/auth.module";
// CONTROLLERS & SERVICES
import { AppController } from "src/app.controller";
import { AppService } from "src/app.service";
// GUARDS
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 100 }
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST") || "localhost",
          port: config.get<number>("REDIS_PORT") || 6379,
          username: config.get<string>("REDIS_USER"),
          password: config.get<string>("REDIS_PASS"),
          db: config.get<number>("REDIS_DB") || 0,
        },
        prefix: config.get<string>("REDIS_KEY_PREFIX") || "crwsync",
      }),
    }),
    HealthModule, 
    PrismaModule, 
    RedisModule,
    UserModule,
    SessionModule,
    AuthModule, 
    EmailModule,
    VerificationModule,
    PasswordResetModule,
    WorkspaceModule,
    StatusModule,
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

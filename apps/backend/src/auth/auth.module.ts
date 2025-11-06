import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "src/auth/auth.controller";
import { UserModule } from "src/user/user.module";
import { AuthService } from "src/auth/auth.service";
import { EmailModule } from "src/email/email.module";
import { SessionModule } from "src/session/session.module";
import { VerificationModule } from "src/email-verification/email-verification.module";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    UserModule,
    SessionModule,
    ConfigModule,
    EmailModule,
    VerificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        const expiresIn = config.get<string>("JWT_ACCESS_TOKEN_EXPIRATION");

        return {
          secret: secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
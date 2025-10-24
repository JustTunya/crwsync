import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "src/auth/auth.controller";
import { UserModule } from "src/user/user.module";
import { AuthService } from "src/auth/auth.service";
import { EmailModule } from "src/email/email.module";
import { SessionModule } from "src/session/session.module";

@Module({
  imports: [
    UserModule,
    SessionModule,
    ConfigModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<string | number>("JWT_EXPIRES_IN", "1h") },
      }),
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
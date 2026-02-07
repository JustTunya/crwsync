
import { Module } from "@nestjs/common";
import { StatusGateway } from "./status.gateway";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_ACCESS_TOKEN_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [StatusGateway],
  exports: [StatusGateway],
})
export class StatusModule {}

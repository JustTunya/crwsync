import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";
import { StatusModule } from "src/status/status.module";
import { ChatService } from "src/chat/chat.service";
import { ChatGateway } from "src/chat/chat.gateway";
import { ChatController } from "src/chat/chat.controller";

@Module({
  imports: [
    PrismaModule,
    StatusModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_ACCESS_TOKEN_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}

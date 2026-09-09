import { Module, Logger } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";
import { StatusModule } from "src/status/status.module";
import { SessionModule } from "src/session/session.module";
import { ChatService } from "src/chat/chat.service";
import { ChatGateway } from "src/chat/chat.gateway";
import { ChatController } from "src/chat/chat.controller";
import { BullModule } from "@nestjs/bullmq";
import { ChatProcessor } from "src/chat/chat.processor";

@Module({
  imports: [
    PrismaModule,
    StatusModule,
    SessionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_ACCESS_TOKEN_SECRET"),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: "chat_messages",
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatProcessor, Logger],
  exports: [ChatService, BullModule],
})
export class ChatModule {}

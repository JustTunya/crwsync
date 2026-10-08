import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ChatModule } from "src/chat/chat.module";
import { AI_QUEUE } from "src/ai/ai.types";
import { AiClient } from "src/ai/ai.client";
import { AiController } from "src/ai/ai.controller";
import { AiStatusController } from "src/ai/ai-status.controller";
import { AiEnabledGuard } from "src/ai/ai-enabled.guard";
import { AiProcessor } from "src/ai/ai.processor";
import { AiService } from "src/ai/ai.service";

@Module({
  imports: [
    ChatModule,
    BullModule.registerQueue({
      name: AI_QUEUE,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { age: 600 },
        removeOnFail: { age: 600 },
      },
    }),
  ],
  controllers: [AiController, AiStatusController],
  providers: [AiService, AiProcessor, AiClient, AiEnabledGuard],
})
export class AiModule {}

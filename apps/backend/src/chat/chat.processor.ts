import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ChatService } from "src/chat/chat.service";
import { SendMessageDto } from "src/chat/dto/chat.dto";

// Custom decorator stub for compatibility with standard Bull style method decorations
/* eslint-disable @typescript-eslint/no-unused-vars */
export function Process(name?: string): MethodDecorator {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Custom decorator metadata or no-op
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars */

interface PersistMessageJobData {
  workspaceId: string;
  roomId: string;
  senderId: string;
  dto: SendMessageDto;
  preGeneratedId: string;
}

@Processor("chat_messages")
@Injectable()
export class ChatProcessor extends WorkerHost {
  constructor(
    private readonly chatService: ChatService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<PersistMessageJobData, unknown, string>): Promise<unknown> {
    switch (job.name) {
      case "persist_message":
        return this.persist_message(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  @Process("persist_message")
  async persist_message(job: Job<PersistMessageJobData, unknown, string>): Promise<void> {
    const { workspaceId, roomId, senderId, dto, preGeneratedId } = job.data;
    await this.chatService
      .createMessage(workspaceId, roomId, senderId, dto, preGeneratedId)
      .catch((error) => {
        this.logger.error(
          `Failed to persist message in room ${roomId}: ${error.message}`,
          error.stack,
        );
        throw error;
      });
  }
}

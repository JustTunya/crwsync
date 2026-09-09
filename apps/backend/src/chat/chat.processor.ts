import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ChatService } from "src/chat/chat.service";
import { ChatGateway } from "src/chat/chat.gateway";
import { SendMessageDto } from "src/chat/dto/chat.dto";

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
    private readonly chatGateway: ChatGateway,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<PersistMessageJobData, unknown, string>): Promise<unknown> {
    switch (job.name) {
      case "persist_message":
        return this.persistMessage(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async persistMessage(job: Job<PersistMessageJobData, unknown, string>): Promise<void> {
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

  @OnWorkerEvent("failed")
  onFailed(job: Job<PersistMessageJobData, unknown, string>) {
    if (job.name !== "persist_message") return;

    const attemptsMax = job.opts.attempts ?? 1;
    if (job.attemptsMade < attemptsMax) return;

    this.chatGateway.server.to(`chat_${job.data.roomId}`).emit("message_failed", {
      roomId: job.data.roomId,
      preGeneratedId: job.data.preGeneratedId,
    });
  }
}

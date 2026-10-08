import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "src/prisma/prisma.service";
import { ChatService } from "src/chat/chat.service";
import { CacheKeys, CacheService, CacheTTL } from "src/redis";
import { AI_QUEUE, AiJobData, AiJobResult } from "src/ai/ai.types";
import { TaskDraftsDto, StandupDto } from "src/ai/dto/ai.dto";

const DEFAULT_SUMMARY_MESSAGES = 50;
const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_MAX_INPUT_MESSAGES = 200;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    @InjectQueue(AI_QUEUE) private readonly queue: Queue<AiJobData>,
  ) {}

  private get dailyLimit() {
    return Number(this.config.get("AI_DAILY_LIMIT_PER_USER")) || DEFAULT_DAILY_LIMIT;
  }

  private get maxInputMessages() {
    return Number(this.config.get("AI_MAX_INPUT_MESSAGES")) || DEFAULT_MAX_INPUT_MESSAGES;
  }

  private usageKey(userId: string) {
    return CacheKeys.aiUsage(userId, new Date().toISOString().slice(0, 10));
  }

  async getStatus(userId: string) {
    const used = (await this.cache.get<number>(this.usageKey(userId))) ?? 0;
    return {
      enabled: this.config.get<string>("AI_ENABLED") === "true",
      dailyLimit: this.dailyLimit,
      remaining: Math.max(this.dailyLimit - used, 0),
    };
  }

  async summarizeRoom(workspaceId: string, userId: string, roomId: string, limit?: number) {
    await this.chatService.getRoom(roomId, workspaceId, userId);
    return this.enqueue({
      feature: "summary",
      userId,
      workspaceId,
      roomId,
      limit: Math.min(limit ?? DEFAULT_SUMMARY_MESSAGES, this.maxInputMessages),
    });
  }

  async draftTasks(workspaceId: string, userId: string, roomId: string, dto: TaskDraftsDto) {
    await this.chatService.getRoom(roomId, workspaceId, userId);
    await this.assertBoard(workspaceId, dto.boardId);
    const messageIds = [...new Set(dto.messageIds)].slice(0, this.maxInputMessages);
    const inRoom = await this.prisma.chatMessage.count({ where: { id: { in: messageIds }, room_id: roomId, is_deleted: false } });
    if (inRoom !== messageIds.length) throw new BadRequestException("Some selected messages are not in this room");
    return this.enqueue({ feature: "task_drafts", userId, workspaceId, roomId, boardId: dto.boardId, messageIds });
  }

  async digestBoard(workspaceId: string, userId: string, boardId: string, since?: string) {
    await this.assertBoard(workspaceId, boardId);
    return this.enqueue({ feature: "digest", userId, workspaceId, boardId, since });
  }

  async standup(workspaceId: string, userId: string, dto: StandupDto) {
    const memberId = dto.memberId ?? userId;
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: memberId } },
      select: { id: true },
    });
    if (!member) throw new NotFoundException("Member not found");
    return this.enqueue({ feature: "standup", userId, workspaceId, memberId, since: dto.since });
  }

  async getJob(workspaceId: string, userId: string, jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data.userId !== userId || job.data.workspaceId !== workspaceId) throw new NotFoundException("Job not found");
    const state = await job.getState();
    if (state === "completed") return { status: "done" as const, result: job.returnvalue as AiJobResult };
    if (state === "failed") return { status: "failed" as const, error: job.failedReason };
    return { status: "pending" as const };
  }

  private async assertBoard(workspaceId: string, boardId: string) {
    const board = await this.prisma.board.findFirst({ where: { id: boardId, workspace_id: workspaceId }, select: { id: true } });
    if (!board) throw new NotFoundException("Board not found");
  }

  private async enqueue(data: AiJobData) {
    const used = await this.cache.incrWithTtl(this.usageKey(data.userId), CacheTTL.AI_USAGE);
    if (used > this.dailyLimit) {
      throw new HttpException(`Daily AI limit reached (${this.dailyLimit} requests per day). It resets at 00:00 UTC.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    const job = await this.queue.add(data.feature, data);
    return { jobId: job.id };
  }
}

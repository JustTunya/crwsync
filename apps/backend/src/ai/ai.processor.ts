import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "src/prisma/prisma.service";
import { AiClient, AiResult, AiUnavailableError } from "src/ai/ai.client";
import { AI_QUEUE, AiJobData, AiJobResult, TaskDraft } from "src/ai/ai.types";
import { Prompt, PromptMessage } from "src/ai/prompts/common";
import { buildSummaryPrompt } from "src/ai/prompts/summary.prompt";
import { buildDigestPrompt } from "src/ai/prompts/digest.prompt";
import { TASK_DRAFTS_TOOL, buildTaskDraftsPrompt } from "src/ai/prompts/task-drafts.prompt";
import { buildStandupPrompt } from "src/ai/prompts/standup.prompt";

const DAY_MS = 86_400_000;
const NAME_SELECT = { firstname: true, lastname: true };

const displayName = (user: { firstname: string; lastname: string }) => `${user.firstname} ${user.lastname}`;

interface MoveMetadata {
  fromColumnName?: string | null;
  toColumnName?: string;
}

@Processor(AI_QUEUE, { concurrency: 4 })
@Injectable()
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: AiClient,
  ) {
    super();
  }

  async process(job: Job<AiJobData>): Promise<AiJobResult> {
    const { feature, userId, workspaceId } = job.data;
    try {
      switch (feature) {
        case "summary":
          return await this.summary(job.data);
        case "digest":
          return await this.digest(job.data);
        case "task_drafts":
          return await this.taskDrafts(job.data);
        case "standup":
          return await this.standup(job.data);
      }
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: "ai_failed", feature, userId, workspaceId, error: (error as Error).name }));
      throw error instanceof AiUnavailableError ? error : new AiUnavailableError();
    }
  }

  private async run(data: AiJobData, prompt: Prompt, maxTokens: number, tool?: typeof TASK_DRAFTS_TOOL): Promise<AiResult> {
    const result = await this.client.generate(prompt, maxTokens, tool);
    this.logger.log(
      JSON.stringify({
        event: "ai_request",
        feature: data.feature,
        userId: data.userId,
        workspaceId: data.workspaceId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      }),
    );
    return result;
  }

  private async summary(data: AiJobData): Promise<AiJobResult> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { room_id: data.roomId, workspace_id: data.workspaceId, is_deleted: false },
      orderBy: { created_at: "desc" },
      take: data.limit,
      select: { content: true, created_at: true, sender: { select: NAME_SELECT } },
    });
    if (!rows.length) return { feature: "summary", empty: true };
    const messages: PromptMessage[] = rows.reverse().map((m) => ({ author: displayName(m.sender), at: m.created_at, text: m.content }));
    const result = await this.run(data, buildSummaryPrompt(messages), 800);
    return { feature: "summary", text: result.text };
  }

  private async taskDrafts(data: AiJobData): Promise<AiJobResult> {
    const [rows, columns] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { id: { in: data.messageIds }, room_id: data.roomId, workspace_id: data.workspaceId, is_deleted: false },
        orderBy: { created_at: "asc" },
        select: { content: true, created_at: true, sender: { select: NAME_SELECT } },
      }),
      this.prisma.boardColumn.findMany({
        where: { board_id: data.boardId, board: { workspace_id: data.workspaceId } },
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    if (!rows.length) return { feature: "task_drafts", empty: true };
    const messages: PromptMessage[] = rows.map((m) => ({ author: displayName(m.sender), at: m.created_at, text: m.content }));
    const prompt = buildTaskDraftsPrompt(messages, columns.map((c) => c.name));
    const result = await this.run(data, prompt, 1200, TASK_DRAFTS_TOOL);
    const proposed = (result.toolInput as { tasks?: { title?: unknown; description?: unknown; column?: unknown }[] } | null)?.tasks ?? [];
    const drafts: TaskDraft[] = proposed
      .slice(0, 10)
      .filter((t) => typeof t.title === "string" && t.title.trim())
      .map((t) => ({
        title: (t.title as string).trim().slice(0, 200),
        description: typeof t.description === "string" ? t.description.slice(0, 2000) : "",
        column_id: columns.find((c) => c.name === t.column)?.id ?? null,
      }));
    return { feature: "task_drafts", empty: !drafts.length, drafts };
  }

  private async digest(data: AiJobData): Promise<AiJobResult> {
    const now = new Date();
    const since = this.since(data.since, now, 7 * DAY_MS);
    const board = await this.prisma.board.findFirst({
      where: { id: data.boardId, workspace_id: data.workspaceId },
      select: {
        name: true,
        columns: {
          orderBy: { position: "asc" },
          select: {
            name: true,
            type: true,
            tasks: {
              where: { is_deleted: false, is_archived: false },
              take: 100,
              select: { title: true, priority: true, due_date: true, labels: true, tags: true, assignee: { select: NAME_SELECT } },
            },
          },
        },
      },
    });
    if (!board) return { feature: "digest", empty: true };
    const moves = await this.prisma.taskActivity.findMany({
      where: { type: "COLUMN_MOVED", created_at: { gte: since }, task: { is_deleted: false, column: { board_id: data.boardId } } },
      orderBy: { created_at: "desc" },
      take: 100,
      select: { created_at: true, metadata: true, task: { select: { title: true } }, actor: { select: NAME_SELECT } },
    });
    const tasks = board.columns.flatMap((column) =>
      column.tasks.map((t) => ({
        title: t.title,
        column: column.name,
        priority: t.priority,
        assignee: t.assignee ? displayName(t.assignee) : null,
        dueDate: t.due_date?.toISOString() ?? null,
        overdue: !!t.due_date && t.due_date < now && column.type !== "COMPLETE",
        labels: t.labels,
        tags: t.tags,
      })),
    );
    if (!tasks.length && !moves.length) return { feature: "digest", empty: true };
    const prompt = buildDigestPrompt({
      board: board.name,
      now: now.toISOString(),
      since: since.toISOString(),
      columns: board.columns.map((c) => ({ name: c.name, type: c.type })),
      tasks,
      moves: moves.map((m) => {
        const meta = m.metadata as MoveMetadata;
        return { task: m.task.title, from: meta.fromColumnName ?? null, to: meta.toColumnName ?? "", by: displayName(m.actor), at: m.created_at.toISOString() };
      }),
    });
    const result = await this.run(data, prompt, 1000);
    return { feature: "digest", text: result.text };
  }

  private async standup(data: AiJobData): Promise<AiJobResult> {
    const now = new Date();
    const since = this.since(data.since, now, DAY_MS);
    const [member, moves, completed, assigned] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: data.memberId }, select: NAME_SELECT }),
      this.prisma.taskActivity.findMany({
        where: { type: "COLUMN_MOVED", actor_id: data.memberId, created_at: { gte: since }, task: { workspace_id: data.workspaceId, is_deleted: false } },
        orderBy: { created_at: "desc" },
        take: 50,
        select: { created_at: true, metadata: true, task: { select: { title: true } } },
      }),
      this.prisma.task.findMany({
        where: { workspace_id: data.workspaceId, assignee_id: data.memberId, is_deleted: false, completed_at: { gte: since } },
        take: 50,
        select: { title: true, completed_at: true },
      }),
      this.prisma.task.findMany({
        where: { workspace_id: data.workspaceId, assignee_id: data.memberId, is_deleted: false, is_archived: false, column: { type: { not: "COMPLETE" } } },
        take: 50,
        select: { title: true, due_date: true, column: { select: { name: true } } },
      }),
    ]);
    if (!member || (!moves.length && !completed.length && !assigned.length)) return { feature: "standup", empty: true };
    const prompt = buildStandupPrompt({
      member: displayName(member),
      since: since.toISOString(),
      now: now.toISOString(),
      moved: moves.map((m) => {
        const meta = m.metadata as MoveMetadata;
        return { task: m.task.title, from: meta.fromColumnName ?? null, to: meta.toColumnName ?? "", at: m.created_at.toISOString() };
      }),
      completed: completed.map((t) => ({ task: t.title, at: t.completed_at?.toISOString() ?? "" })),
      assigned: assigned.map((t) => ({
        task: t.title,
        column: t.column.name,
        dueDate: t.due_date?.toISOString() ?? null,
        overdue: !!t.due_date && t.due_date < now,
      })),
    });
    const result = await this.run(data, prompt, 400);
    return { feature: "standup", text: result.text };
  }

  private since(requested: string | undefined, now: Date, fallbackMs: number): Date {
    const floor = now.getTime() - 30 * DAY_MS;
    const at = requested ? new Date(requested).getTime() : now.getTime() - fallbackMs;
    return new Date(Math.min(Math.max(at, floor), now.getTime()));
  }
}

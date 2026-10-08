import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AiProcessor } from "./ai.processor";
import { AiClient, AiUnavailableError } from "./ai.client";
import { AiJobData } from "./ai.types";
import { PrismaService } from "src/prisma/prisma.service";

describe("AiProcessor", () => {
  let processor: AiProcessor;
  let prisma: {
    chatMessage: { findMany: jest.Mock };
    boardColumn: { findMany: jest.Mock };
  };
  let client: { generate: jest.Mock };
  let logged: string[];

  const job = (data: Partial<AiJobData>) => ({ data: { userId: "user-1", workspaceId: "ws-1", ...data } }) as unknown as Job<AiJobData>;
  const row = (content: string) => ({ content, created_at: new Date("2026-10-01T10:00:00Z"), sender: { firstname: "Ana", lastname: "Kovacs" } });

  beforeEach(() => {
    prisma = { chatMessage: { findMany: jest.fn() }, boardColumn: { findMany: jest.fn() } };
    client = { generate: jest.fn().mockResolvedValue({ text: "SUMMARY TEXT", toolInput: null, inputTokens: 40, outputTokens: 9, latencyMs: 120 }) };
    processor = new AiProcessor(prisma as unknown as PrismaService, client as unknown as AiClient);
    logged = [];
    jest.spyOn(Logger.prototype, "log").mockImplementation((message: unknown) => void logged.push(String(message)));
    jest.spyOn(Logger.prototype, "warn").mockImplementation((message: unknown) => void logged.push(String(message)));
  });

  afterEach(() => jest.restoreAllMocks());

  it("selects only text, time, and author name for a summary, oldest first", async () => {
    prisma.chatMessage.findMany.mockResolvedValue([row("second"), row("first")]);

    const result = await processor.process(job({ feature: "summary", roomId: "room-1", limit: 50 }));

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
      where: { room_id: "room-1", workspace_id: "ws-1", is_deleted: false },
      orderBy: { created_at: "desc" },
      take: 50,
      select: { content: true, created_at: true, sender: { select: { firstname: true, lastname: true } } },
    });
    const prompt = client.generate.mock.calls[0][0];
    expect(prompt.user.indexOf("first")).toBeLessThan(prompt.user.indexOf("second"));
    expect(prompt.user).toContain("Ana Kovacs");
    expect(result).toEqual({ feature: "summary", text: "SUMMARY TEXT" });
  });

  it("skips the model call when there is nothing to summarize", async () => {
    prisma.chatMessage.findMany.mockResolvedValue([]);

    await expect(processor.process(job({ feature: "summary", roomId: "room-1", limit: 50 }))).resolves.toEqual({ feature: "summary", empty: true });
    expect(client.generate).not.toHaveBeenCalled();
  });

  it("logs request metadata but never message content or model output", async () => {
    prisma.chatMessage.findMany.mockResolvedValue([row("the launch code is 1234")]);

    await processor.process(job({ feature: "summary", roomId: "room-1", limit: 50 }));

    const entry = JSON.parse(logged[0]);
    expect(entry).toEqual({ event: "ai_request", feature: "summary", userId: "user-1", workspaceId: "ws-1", inputTokens: 40, outputTokens: 9, latencyMs: 120 });
    expect(logged.join(" ")).not.toContain("launch code");
    expect(logged.join(" ")).not.toContain("SUMMARY TEXT");
  });

  it("maps drafted tasks to real column ids and drops malformed items", async () => {
    prisma.chatMessage.findMany.mockResolvedValue([row("please fix the login page")]);
    prisma.boardColumn.findMany.mockResolvedValue([{ id: "col-1", name: "To do" }, { id: "col-2", name: "Doing" }]);
    client.generate.mockResolvedValue({
      text: "",
      toolInput: { tasks: [{ title: " Fix login ", description: "From chat", column: "Doing" }, { title: "No column", column: "Nope" }, { title: "" }, { description: "no title" }] },
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
    });

    const result = await processor.process(job({ feature: "task_drafts", roomId: "room-1", boardId: "board-1", messageIds: ["m1"] }));

    expect(result.drafts).toEqual([
      { title: "Fix login", description: "From chat", column_id: "col-2" },
      { title: "No column", description: "", column_id: null },
    ]);
  });

  it("turns any failure into the friendly error", async () => {
    prisma.chatMessage.findMany.mockResolvedValue([row("hello")]);
    client.generate.mockRejectedValue(new Error("boom: sk-secret"));

    const call = processor.process(job({ feature: "summary", roomId: "room-1", limit: 50 }));

    await expect(call).rejects.toBeInstanceOf(AiUnavailableError);
    expect(logged.join(" ")).not.toContain("sk-secret");
  });
});

import { ConfigService } from "@nestjs/config";
import { AiClient, AiUnavailableError } from "./ai.client";

const mockCreate = jest.fn();
const mockConstructor = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  const Anthropic = Object.assign(
    jest.fn().mockImplementation((options: unknown) => {
      mockConstructor(options);
      return { messages: { create: mockCreate } };
    }),
    { APIError },
  );
  return { __esModule: true, default: Anthropic };
});

describe("AiClient", () => {
  const env: Record<string, string> = { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "model-from-env" };
  const prompt = { system: "sys", user: "usr" };
  let client: AiClient;

  beforeEach(() => {
    mockCreate.mockReset();
    mockConstructor.mockReset();
    client = new AiClient({ getOrThrow: (key: string) => env[key] } as unknown as ConfigService);
  });

  it("reads the model from config and returns text with token counts", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Hello" }, { type: "text", text: "world" }],
      usage: { input_tokens: 12, output_tokens: 5 },
    });

    const result = await client.generate(prompt, 300);

    expect(mockCreate).toHaveBeenCalledWith({
      model: "model-from-env",
      max_tokens: 300,
      system: "sys",
      messages: [{ role: "user", content: "usr" }],
    });
    expect(result).toMatchObject({ text: "Hello\nworld", toolInput: null, inputTokens: 12, outputTokens: 5 });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("configures a timeout and a single retry, and reuses the SDK client", async () => {
    mockCreate.mockResolvedValue({ content: [], usage: { input_tokens: 1, output_tokens: 1 } });

    await client.generate(prompt, 10);
    await client.generate(prompt, 10);

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: "test-key", timeout: 45_000, maxRetries: 1 });
  });

  it("forces the given tool and returns its input", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t1", name: "propose_tasks", input: { tasks: [] } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const tool = { name: "propose_tasks", description: "d", input_schema: { type: "object" as const, properties: {} } };

    const result = await client.generate(prompt, 10, tool);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tools: [tool], tool_choice: { type: "tool", name: "propose_tasks" } }));
    expect(result.toolInput).toEqual({ tasks: [] });
  });

  it("turns provider failures into a friendly error without leaking details", async () => {
    mockCreate.mockRejectedValue(new Error("401 invalid x-api-key sk-secret"));

    const call = client.generate(prompt, 10);

    await expect(call).rejects.toBeInstanceOf(AiUnavailableError);
    await expect(call).rejects.toThrow("The AI service is unavailable right now. Try again in a few minutes.");
  });
});

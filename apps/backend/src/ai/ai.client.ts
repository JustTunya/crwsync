import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { Prompt } from "src/ai/prompts/common";

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 1;

export class AiUnavailableError extends Error {
  constructor() {
    super("The AI service is unavailable right now. Try again in a few minutes.");
  }
}

export interface AiResult {
  text: string;
  toolInput: unknown;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name);
  private client?: Anthropic;

  constructor(private readonly config: ConfigService) {}

  async generate(prompt: Prompt, maxTokens: number, tool?: Anthropic.Tool): Promise<AiResult> {
    const startedAt = Date.now();
    try {
      const response = await this.sdk().messages.create({
        model: this.config.getOrThrow<string>("ANTHROPIC_MODEL"),
        max_tokens: maxTokens,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
        ...(tool && { tools: [tool], tool_choice: { type: "tool", name: tool.name } }),
      });
      const toolUse = response.content.find((block) => block.type === "tool_use");
      return {
        text: response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n").trim(),
        toolInput: toolUse?.type === "tool_use" ? toolUse.input : null,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      this.logger.warn(`Anthropic request failed: ${error instanceof Anthropic.APIError ? `status ${error.status}` : (error as Error).name}`);
      throw new AiUnavailableError();
    }
  }

  private sdk(): Anthropic {
    return (this.client ??= new Anthropic({
      apiKey: this.config.getOrThrow<string>("ANTHROPIC_API_KEY"),
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    }));
  }
}

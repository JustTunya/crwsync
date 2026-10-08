import { DATA_NOTICE, Prompt, PromptMessage, formatMessages, wrapData } from "src/ai/prompts/common";

export const TASK_DRAFTS_TOOL = {
  name: "propose_tasks",
  description: "Record the task drafts found in the messages. This only records suggestions; nothing is created.",
  input_schema: {
    type: "object" as const,
    properties: {
      tasks: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short imperative title, under 100 characters" },
            description: { type: "string", description: "One or two sentences of context from the messages" },
            column: { type: "string", description: "Exactly one of the provided column names" },
          },
          required: ["title"],
        },
      },
    },
    required: ["tasks"],
  },
};

const SYSTEM = `You propose task drafts from selected chat messages.
${DATA_NOTICE}
Call propose_tasks once. Propose only concrete work items that the messages clearly ask for or agree on, at most ten.
Do not invent work. If there is none, return an empty list. Set "column" to exactly one of the listed column names that fits, or leave it out.`;

export const buildTaskDraftsPrompt = (messages: PromptMessage[], columns: string[]): Prompt => ({
  system: SYSTEM,
  user: `Columns on the target board: ${JSON.stringify(columns)}\n${wrapData("chat_messages", formatMessages(messages))}`,
});

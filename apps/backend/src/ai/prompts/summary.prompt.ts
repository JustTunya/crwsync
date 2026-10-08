import { DATA_NOTICE, Prompt, PromptMessage, formatMessages, wrapData } from "src/ai/prompts/common";

const SYSTEM = `You summarize a team chat room for a teammate who was away.
${DATA_NOTICE}
Reply with exactly three sections, each starting with its heading on its own line:
Summary:
(three to six short sentences on what was discussed)
Decisions:
(one dash-prefixed line per decision that was clearly made, or "None recorded.")
Open questions:
(one dash-prefixed line per question or item still unresolved, or "None recorded.")
Only report what the messages state. Do not invent decisions, names, or dates.`;

export const buildSummaryPrompt = (messages: PromptMessage[]): Prompt => ({
  system: SYSTEM,
  user: `Summarize these chat messages, oldest first.\n${wrapData("chat_messages", formatMessages(messages))}`,
});

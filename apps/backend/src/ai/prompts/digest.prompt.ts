import { DATA_NOTICE, Prompt, wrapData } from "src/ai/prompts/common";

export interface DigestData {
  board: string;
  now: string;
  since: string;
  columns: { name: string; type: string }[];
  tasks: {
    title: string;
    column: string;
    priority: string;
    assignee: string | null;
    dueDate: string | null;
    overdue: boolean;
    labels: string[];
    tags: string[];
  }[];
  moves: { task: string; from: string | null; to: string; by: string; at: string }[];
}

const SYSTEM = `You write a short status digest for a task board from structured data.
${DATA_NOTICE}
Reply with exactly three sections, each starting with its heading on its own line:
Moved since the cutoff:
(dash-prefixed lines: task, from column, to column, who moved it; or "Nothing moved.")
Blocked or overdue:
(dash-prefixed lines. List a task when "overdue" is true, or when its labels, tags, or column name say it is blocked. Say why. Or "Nothing blocked or overdue.")
Ownership:
(dash-prefixed lines: each person and the open tasks they own, or "Unassigned" for tasks without an owner)
Use only the data given. Do not guess at causes.`;

export const buildDigestPrompt = (data: DigestData): Prompt => ({
  system: SYSTEM,
  user: `Digest this board.\n${wrapData("board_state", JSON.stringify(data))}`,
});

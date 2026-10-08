import { DATA_NOTICE, Prompt, wrapData } from "src/ai/prompts/common";

export interface StandupData {
  member: string;
  since: string;
  now: string;
  moved: { task: string; from: string | null; to: string; at: string }[];
  completed: { task: string; at: string }[];
  assigned: { task: string; column: string; dueDate: string | null; overdue: boolean }[];
}

const SYSTEM = `You write a short stand-up note for one team member from their recent task activity.
${DATA_NOTICE}
Write in the third person, using the member's name. Reply with exactly three sections, each starting with its heading on its own line:
Done:
(dash-prefixed lines for completed or moved-forward work, or "Nothing recorded.")
In progress:
(dash-prefixed lines for assigned tasks that are not complete, or "Nothing recorded.")
Needs attention:
(dash-prefixed lines for overdue tasks, or "Nothing recorded.")
Use only the data given. Keep the whole note under 120 words.`;

export const buildStandupPrompt = (data: StandupData): Prompt => ({
  system: SYSTEM,
  user: `Write the stand-up note.\n${wrapData("task_activity", JSON.stringify(data))}`,
});

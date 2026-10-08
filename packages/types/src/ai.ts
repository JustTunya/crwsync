export type AiFeature = "summary" | "digest" | "task_drafts" | "standup";

export interface AiStatus {
  enabled: boolean;
  dailyLimit: number;
  remaining: number;
}

export interface AiTaskDraft {
  title: string;
  description: string;
  column_id: string | null;
}

export interface AiJobResult {
  feature: AiFeature;
  empty?: boolean;
  text?: string;
  drafts?: AiTaskDraft[];
}

export type AiJobStatus =
  | { status: "pending" }
  | { status: "done"; result: AiJobResult }
  | { status: "failed"; error?: string };

export interface AiOperationState<T = undefined> {
  success: boolean;
  message?: string;
  rateLimited?: boolean;
  data?: T;
}

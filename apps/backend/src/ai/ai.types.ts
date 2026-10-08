export const AI_QUEUE = "ai";

export type AiFeature = "summary" | "digest" | "task_drafts" | "standup";

export interface AiJobData {
  feature: AiFeature;
  userId: string;
  workspaceId: string;
  roomId?: string;
  boardId?: string;
  messageIds?: string[];
  memberId?: string;
  limit?: number;
  since?: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  column_id: string | null;
}

export interface AiJobResult {
  feature: AiFeature;
  empty?: boolean;
  text?: string;
  drafts?: TaskDraft[];
}

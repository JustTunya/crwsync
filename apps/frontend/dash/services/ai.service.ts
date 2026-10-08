import { isAxiosError } from "axios";
import type { AiJobStatus, AiOperationState, AiStatus } from "@crwsync/types";
import { api } from "@/services/auth.service";

const AI_BASE = (workspaceId: string) => `/workspaces/${workspaceId}/ai`;

function failure(error: unknown, fallback: string): AiOperationState<never> {
  if (!isAxiosError(error)) return { success: false, message: "An unexpected error occurred" };
  const detail = error.response?.data?.error;
  const message = typeof detail === "string" ? detail : detail?.message;
  return {
    success: false,
    rateLimited: error.response?.status === 429,
    message: (Array.isArray(message) ? message[0] : message) || fallback,
  };
}

export async function getAiStatus(): Promise<AiOperationState<AiStatus>> {
  try {
    const response = await api.get("/ai/status");
    return { success: true, data: response.data };
  } catch (error) {
    return failure(error, "Failed to load AI status");
  }
}

async function startJob(url: string, body: object): Promise<AiOperationState<{ jobId: string }>> {
  try {
    const response = await api.post(url, body);
    return { success: true, data: response.data };
  } catch (error) {
    return failure(error, "The AI request could not be started");
  }
}

export const summarizeRoom = (workspaceId: string, roomId: string, limit: number) =>
  startJob(`${AI_BASE(workspaceId)}/rooms/${roomId}/summary`, { limit });

export const draftTasks = (workspaceId: string, roomId: string, boardId: string, messageIds: string[]) =>
  startJob(`${AI_BASE(workspaceId)}/rooms/${roomId}/task-drafts`, { boardId, messageIds });

export const digestBoard = (workspaceId: string, boardId: string, since: string) =>
  startJob(`${AI_BASE(workspaceId)}/boards/${boardId}/digest`, { since });

export const standup = (workspaceId: string, memberId: string, since: string) =>
  startJob(`${AI_BASE(workspaceId)}/standup`, { memberId, since });

export async function getAiJob(workspaceId: string, jobId: string): Promise<AiOperationState<AiJobStatus>> {
  try {
    const response = await api.get(`${AI_BASE(workspaceId)}/jobs/${jobId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return failure(error, "Failed to load the AI result");
  }
}

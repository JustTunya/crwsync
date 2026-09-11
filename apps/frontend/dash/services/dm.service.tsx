import { isAxiosError } from "axios";
import { ChatRoom, DmRoomSummary, CreateDmPayload, BoardOperationState } from "@crwsync/types";
import { api } from "@/services/auth.service";

const DM_BASE = (wsId: string) => `/workspaces/${wsId}/dms`;

export async function listDirectMessages(
  workspaceId: string,
): Promise<BoardOperationState<DmRoomSummary[]>> {
  try {
    const response = await api.get(DM_BASE(workspaceId));
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch direct messages",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function openDirectMessage(
  workspaceId: string,
  payload: CreateDmPayload,
): Promise<BoardOperationState<ChatRoom>> {
  try {
    const response = await api.post(DM_BASE(workspaceId), payload);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to open direct message",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

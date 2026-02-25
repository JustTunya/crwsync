import { isAxiosError } from "axios";
import {
  ChatRoom,
  ChatMessagePage,
  CreateChatRoomPayload,
  BoardOperationState,
} from "@crwsync/types";
import { api } from "@/services/auth.service";

const CHAT_BASE = (wsId: string) => `/workspaces/${wsId}/chat`;

export async function createChatRoom(
  workspaceId: string,
  data: CreateChatRoomPayload,
): Promise<BoardOperationState<ChatRoom>> {
  try {
    const response = await api.post(CHAT_BASE(workspaceId), data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create chat room",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getChatRoom(
  workspaceId: string,
  roomId: string,
): Promise<BoardOperationState<ChatRoom>> {
  try {
    const response = await api.get(`${CHAT_BASE(workspaceId)}/${roomId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch chat room",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getChatMessages(
  workspaceId: string,
  roomId: string,
  cursor?: string,
  limit?: number,
): Promise<BoardOperationState<ChatMessagePage>> {
  try {
    const params: Record<string, string | number> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;

    const response = await api.get(
      `${CHAT_BASE(workspaceId)}/${roomId}/messages`,
      { params },
    );
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch messages",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

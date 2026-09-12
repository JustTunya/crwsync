import { isAxiosError } from "axios";
import { api } from "@/services/auth.service";

export interface SearchResults {
  tasks: { id: string; shortId: string; title: string; boardId: string; boardName: string; columnName: string }[];
  chats: { id: string; roomId: string; roomName: string | null; content: string; createdAt: string }[];
  files: { id: string; fileName: string; fileRoomId: string; fileRoomName: string | null }[];
  members: { id: string; firstname: string; lastname: string; username: string; avatarKey: string | null; role: string }[];
}

export interface SearchOperationState<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function searchWorkspace(
  workspaceId: string,
  q: string,
): Promise<SearchOperationState<SearchResults>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/search`, { params: { q } });
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || "Failed to search" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

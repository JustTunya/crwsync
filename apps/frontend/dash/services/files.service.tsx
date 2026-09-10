import { isAxiosError } from "axios";
import {
  FileRoom,
  WorkspaceFile,
  CreateFileRoomPayload,
  CreateWorkspaceFilePayload,
  BoardOperationState,
  PresignedAvatarUpload,
} from "@crwsync/types";
import { api } from "@/services/auth.service";

const FILES_BASE = (wsId: string) => `/workspaces/${wsId}/file-rooms`;

export async function createFileRoom(
  workspaceId: string,
  data: CreateFileRoomPayload,
): Promise<BoardOperationState<FileRoom>> {
  try {
    const response = await api.post(FILES_BASE(workspaceId), data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create file room",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getFileRoom(
  workspaceId: string,
  roomId: string,
): Promise<BoardOperationState<FileRoom>> {
  try {
    const response = await api.get(`${FILES_BASE(workspaceId)}/${roomId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch file room",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getFiles(
  workspaceId: string,
  roomId: string,
): Promise<BoardOperationState<WorkspaceFile[]>> {
  try {
    const response = await api.get(`${FILES_BASE(workspaceId)}/${roomId}/files`);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch files",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function presignFileUpload(
  workspaceId: string,
  roomId: string,
  contentType: string,
  fileName: string,
): Promise<BoardOperationState<PresignedAvatarUpload>> {
  try {
    const response = await api.post(
      `${FILES_BASE(workspaceId)}/${roomId}/files/presign`,
      { contentType, fileName },
    );
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to presign upload",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function createWorkspaceFile(
  workspaceId: string,
  roomId: string,
  data: CreateWorkspaceFilePayload,
): Promise<BoardOperationState<WorkspaceFile>> {
  try {
    const response = await api.post(`${FILES_BASE(workspaceId)}/${roomId}/files`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to save file",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function deleteWorkspaceFile(
  workspaceId: string,
  roomId: string,
  fileId: string,
): Promise<BoardOperationState<undefined>> {
  try {
    await api.delete(`${FILES_BASE(workspaceId)}/${roomId}/files/${fileId}`);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete file",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

import { isAxiosError } from "axios";
import {
  Board,
  BoardColumn,
  Task,
  WorkspaceModule,
  CreateBoardPayload,
  UpdateBoardPayload,
  CreateColumnPayload,
  UpdateColumnPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
  ReorderColumnsPayload,
  ReorderModulesPayload,
  BoardOperationState,
} from "@crwsync/types";
import { api } from "@/services/auth.service";

const BASE = (wsId: string) => `/workspaces/${wsId}/boards`;
const MODULE_BASE = (wsId: string) => `/workspaces/${wsId}/modules`;

export async function getBoards(
  workspaceId: string,
): Promise<BoardOperationState<Board[]>> {
  try {
    const response = await api.get(BASE(workspaceId));
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch boards",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getBoard(
  workspaceId: string,
  boardId: string,
): Promise<BoardOperationState<Board>> {
  try {
    const response = await api.get(`${BASE(workspaceId)}/${boardId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch board",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function createBoard(
  workspaceId: string,
  data: CreateBoardPayload,
): Promise<BoardOperationState<Board>> {
  try {
    const response = await api.post(BASE(workspaceId), data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create board",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateBoard(
  workspaceId: string,
  boardId: string,
  data: UpdateBoardPayload,
): Promise<BoardOperationState<Board>> {
  try {
    const response = await api.patch(`${BASE(workspaceId)}/${boardId}`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update board",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function deleteBoard(
  workspaceId: string,
  boardId: string,
): Promise<BoardOperationState> {
  try {
    await api.delete(`${BASE(workspaceId)}/${boardId}`);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete board",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function createColumn(
  workspaceId: string,
  boardId: string,
  data: CreateColumnPayload,
): Promise<BoardOperationState<BoardColumn>> {
  try {
    const response = await api.post(`${BASE(workspaceId)}/${boardId}/columns`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create column",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateColumn(
  workspaceId: string,
  boardId: string,
  columnId: string,
  data: UpdateColumnPayload,
): Promise<BoardOperationState<BoardColumn>> {
  try {
    const response = await api.patch(`${BASE(workspaceId)}/${boardId}/columns/${columnId}`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update column",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function deleteColumn(
  workspaceId: string,
  boardId: string,
  columnId: string,
): Promise<BoardOperationState> {
  try {
    await api.delete(`${BASE(workspaceId)}/${boardId}/columns/${columnId}`);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete column",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function reorderColumns(
  workspaceId: string,
  boardId: string,
  data: ReorderColumnsPayload,
): Promise<BoardOperationState> {
  try {
    await api.put(`${BASE(workspaceId)}/${boardId}/columns/reorder`, data);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reorder columns",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function createTask(
  workspaceId: string,
  boardId: string,
  data: CreateTaskPayload & { column_id: string },
): Promise<BoardOperationState<Task>> {
  try {
    const response = await api.post(`${BASE(workspaceId)}/${boardId}/tasks`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create task",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
  data: UpdateTaskPayload,
): Promise<BoardOperationState<Task>> {
  try {
    const response = await api.patch(`${BASE(workspaceId)}/${boardId}/tasks/${taskId}`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update task",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function deleteTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
): Promise<BoardOperationState> {
  try {
    await api.delete(`${BASE(workspaceId)}/${boardId}/tasks/${taskId}`);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete task",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function moveTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
  data: MoveTaskPayload,
): Promise<BoardOperationState> {
  try {
    await api.put(`${BASE(workspaceId)}/${boardId}/tasks/${taskId}/move`, data);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to move task",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getWorkspaceModules(
  workspaceId: string,
): Promise<BoardOperationState<WorkspaceModule[]>> {
  try {
    const response = await api.get(MODULE_BASE(workspaceId));
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch modules",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function reorderModules(
  workspaceId: string,
  data: ReorderModulesPayload,
): Promise<BoardOperationState> {
  try {
    await api.put(`${MODULE_BASE(workspaceId)}/reorder`, data);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reorder modules",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

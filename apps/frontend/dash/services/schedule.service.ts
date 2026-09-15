import { isAxiosError } from "axios";
import {
  ScheduleFilters,
  ScheduleResponse,
  WorkspaceOperationState,
} from "@crwsync/types";
import { api } from "@/services/auth.service";

export async function getSchedules(
  workspaceId: string,
  filters?: ScheduleFilters,
): Promise<WorkspaceOperationState<ScheduleResponse>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/boards/schedules`, {
      params: filters,
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch schedules",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

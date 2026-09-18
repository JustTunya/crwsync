import { isAxiosError } from "axios";
import { WorkspaceHomeData, WorkspaceOperationState } from "@crwsync/types";
import { api } from "@/services/auth.service";

export async function getWorkspaceHome(
  workspaceId: string
): Promise<WorkspaceOperationState<WorkspaceHomeData>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/home`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch workspace home data",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

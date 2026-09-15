import { isAxiosError } from "axios";
import { api } from "@/services/auth.service";
import type {
  WorkspaceStatisticsData,
  StatisticsQueryParams,
} from "@crwsync/types";

export async function getWorkspaceStatistics(
  workspaceId: string,
  params?: StatisticsQueryParams
): Promise<WorkspaceStatisticsData> {
  try {
    const response = await api.get<WorkspaceStatisticsData>(
      `/workspaces/${workspaceId}/statistics`,
      { params }
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch workspace statistics"
      );
    }
    throw new Error("An unexpected error occurred");
  }
}

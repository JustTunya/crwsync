import { isAxiosError } from "axios";
import { api } from "@/services/auth.service";

export interface WorkspaceStatistics {
  personalWorkload: number;
  personalVelocity: number;
  personalCycleTime: number | null;
  velocityTimeline: { date: string; count: number }[];
}

export async function getWorkspaceStatistics(
  workspaceId: string,
  interval: string
): Promise<WorkspaceStatistics> {
  try {
    const response = await api.get<WorkspaceStatistics>(
      `/workspaces/${workspaceId}/statistics`,
      { params: { interval } }
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

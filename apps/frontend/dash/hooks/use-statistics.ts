"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaceStatistics } from "@/services/statistics.service";

export const statisticsKeys = {
  all: ["statistics"] as const,
  detail: (workspaceId: string, interval: string) =>
    [...statisticsKeys.all, workspaceId, interval] as const,
};

export function useStatistics(workspaceId?: string, interval: string = "1m") {
  return useQuery({
    queryKey: statisticsKeys.detail(workspaceId || "unknown", interval),
    queryFn: () => getWorkspaceStatistics(workspaceId!, interval),
    enabled: !!workspaceId,
    staleTime: 0,
  });
}

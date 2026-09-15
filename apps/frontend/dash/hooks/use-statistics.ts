"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getWorkspaceStatistics } from "@/services/statistics.service";
import type { StatisticsQueryParams } from "@crwsync/types";

export const statisticsKeys = {
  all: ["statistics"] as const,
  detail: (workspaceId: string, params?: StatisticsQueryParams) =>
    [...statisticsKeys.all, workspaceId, params ?? {}] as const,
};

export function useStatistics(
  workspaceId?: string,
  params?: StatisticsQueryParams
) {
  return useQuery({
    queryKey: statisticsKeys.detail(workspaceId || "unknown", params),
    queryFn: () => getWorkspaceStatistics(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

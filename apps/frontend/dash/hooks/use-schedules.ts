import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ScheduleFilters } from "@crwsync/types";
import { getSchedules } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/query-keys";

export { scheduleKeys } from "@/hooks/query-keys";

export function useSchedules(workspaceId?: string, filters?: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleKeys.list(
      workspaceId || "",
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => getSchedules(workspaceId!, filters),
    enabled: !!workspaceId,
    select: (result) => result.data,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });
}

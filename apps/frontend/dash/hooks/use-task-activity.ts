import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskActivityPage } from "@crwsync/types";
import * as boardService from "@/services/board.service";
import { activityKeys } from "@/hooks/query-keys";

export function useTaskActivity(workspaceId?: string, taskId?: string) {
  return useQuery({
    queryKey: activityKeys.list(taskId!),
    queryFn: () => boardService.getTaskActivity(workspaceId!, taskId!),
    enabled: !!workspaceId && !!taskId,
    select: (result) => result.data,
  });
}

export function useLoadOlderActivity(workspaceId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cursor: string) => {
      const { success, data, message } = await boardService.getTaskActivity(workspaceId, taskId, cursor);
      if (!success || !data) throw new Error(message);
      return data;
    },
    onSuccess: (olderPage) => {
      queryClient.setQueryData(
        activityKeys.list(taskId),
        (old: { data: TaskActivityPage } | undefined) => {
          if (!old?.data) return old;
          const existingIds = new Set(old.data.activities.map((a) => a.id));
          const merged = [...olderPage.activities.filter((a) => !existingIds.has(a.id)), ...old.data.activities];
          return {
            ...old,
            data: { activities: merged, next_cursor: olderPage.next_cursor, has_more: olderPage.has_more },
          };
        },
      );
    },
  });
}

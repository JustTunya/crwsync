import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReorderModulesPayload, WorkspaceModule } from "@crwsync/types";
import * as boardService from "@/services/board.service";

export const moduleKeys = {
  all: ["modules"] as const,
  list: (workspaceId: string) =>
    [...moduleKeys.all, "list", workspaceId] as const,
};

export function useWorkspaceModules(workspaceId?: string) {
  return useQuery({
    queryKey: moduleKeys.list(workspaceId!),
    queryFn: () => boardService.getWorkspaceModules(workspaceId!),
    enabled: !!workspaceId,
    select: (result) => result.data,
  });
}

export function useReorderModules(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderModulesPayload) =>
      boardService.reorderModules(workspaceId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: moduleKeys.list(workspaceId),
      });
      const previous = queryClient.getQueryData(moduleKeys.list(workspaceId));

      queryClient.setQueryData(
        moduleKeys.list(workspaceId),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          const moduleMap = new Map(old.data.map((m) => [m.id, m]));
          const reordered = data.module_ids
            .map((id) => moduleMap.get(id))
            .filter(Boolean) as WorkspaceModule[];
          return { ...old, data: reordered };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          moduleKeys.list(workspaceId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

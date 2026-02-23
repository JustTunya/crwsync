import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReorderModulesPayload, WorkspaceModule, Board } from "@crwsync/types";
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

export function useUpdateModule(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      data,
    }: {
      moduleId: string;
      data: Partial<WorkspaceModule>;
    }) => boardService.updateModule(workspaceId, moduleId, data),
    onMutate: async ({ moduleId, data }) => {
      await queryClient.cancelQueries({
        queryKey: moduleKeys.list(workspaceId),
      });
      const previous = queryClient.getQueryData(moduleKeys.list(workspaceId));

      let referenceId: string | undefined;
      const prevData = previous as { data: WorkspaceModule[] } | undefined;
      if (prevData?.data) {
        const mod = prevData.data.find((m) => m.id === moduleId);
        if (mod && mod.type === "BOARD") {
          referenceId = mod.reference_id;
        }
      }

      queryClient.setQueryData(
        moduleKeys.list(workspaceId),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((m) =>
              m.id === moduleId ? { ...m, ...data } : m,
            ),
          };
        },
      );

      if (referenceId && data.name) {
        queryClient.setQueryData(
          ["boards", "detail", referenceId],
          (old: { data: Board } | undefined) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: { ...old.data, name: data.name },
            };
          }
        );
      }

      return { previous, referenceId };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(moduleKeys.list(workspaceId), context.previous);
      }
    },
    onSettled: (_, __, ___, context) => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
      if (context?.referenceId) {
        queryClient.invalidateQueries({ queryKey: ["boards", "detail", context.referenceId] });
      }
    },
  });
}

export function useDeleteModule(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: string) =>
      boardService.deleteModule(workspaceId, moduleId),
    onMutate: async (moduleId) => {
      await queryClient.cancelQueries({
        queryKey: moduleKeys.list(workspaceId),
      });
      const previous = queryClient.getQueryData(moduleKeys.list(workspaceId));

      queryClient.setQueryData(
        moduleKeys.list(workspaceId),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((m) => m.id !== moduleId),
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(moduleKeys.list(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

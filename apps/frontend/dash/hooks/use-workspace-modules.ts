import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ReorderModulesPayload,
  WorkspaceModule,
  Board,
  WorkspaceHomeData,
  HomePinnedModule,
  ModuleTypeEnum,
} from "@crwsync/types";
import * as boardService from "@/services/board.service";
import { boardKeys, moduleKeys, homeKeys } from "@/hooks/query-keys";
export { moduleKeys } from "@/hooks/query-keys";

export function useWorkspaceModules(workspaceId?: string) {
  return useQuery({
    queryKey: moduleKeys.list(workspaceId!),
    queryFn: () => boardService.getWorkspaceModules(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
    select: (result) => result.data,
  });
}

export function useReorderModules(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderModulesPayload) => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return boardService.reorderModules(workspaceId, data);
    },
    onMutate: async (data) => {
      if (!workspaceId) return;
      await queryClient.cancelQueries({
        queryKey: moduleKeys.list(workspaceId),
      });
      const previous = queryClient.getQueryData(moduleKeys.list(workspaceId));

      queryClient.setQueryData(
        moduleKeys.list(workspaceId),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          const moduleMap = new Map(old.data.map((m) => [m.id, m]));
          data.updates.forEach((update) => {
            const mod = moduleMap.get(update.id);
            if (mod) {
              moduleMap.set(update.id, { ...mod, position: update.position, project_id: update.project_id });
            }
          });
          const reordered = Array.from(moduleMap.values()).sort((a, b) => a.position - b.position);
          return { ...old, data: reordered };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous && workspaceId) {
        queryClient.setQueryData(
          moduleKeys.list(workspaceId),
          context.previous,
        );
      }
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
    }) => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return boardService.updateModule(workspaceId, moduleId, data);
    },
    onMutate: async ({ moduleId, data }) => {
      if (!workspaceId) return;
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
          boardKeys.detail(referenceId),
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
      if (context?.previous && workspaceId) {
        queryClient.setQueryData(moduleKeys.list(workspaceId), context.previous);
      }
    },
    onSettled: (_, __, ___, context) => {
      if (!workspaceId) return;
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
      if (context?.referenceId) {
        queryClient.invalidateQueries({ queryKey: boardKeys.detail(context.referenceId) });
      }
    },
  });
}

export function useDeleteModule(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: string) => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return boardService.deleteModule(workspaceId, moduleId);
    },
    onMutate: async (moduleId) => {
      if (!workspaceId) return;
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
      if (context?.previous && workspaceId) {
        queryClient.setQueryData(moduleKeys.list(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      if (!workspaceId) return;
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

export function useTogglePinModule(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, isPinned }: { moduleId: string; isPinned: boolean }) => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return boardService.togglePinModule(workspaceId, moduleId, isPinned);
    },
    onMutate: async ({ moduleId, isPinned }) => {
      if (!workspaceId) return;
      await queryClient.cancelQueries({
        queryKey: moduleKeys.list(workspaceId),
      });
      await queryClient.cancelQueries({
        queryKey: homeKeys.detail(workspaceId),
      });
      const previousModules = queryClient.getQueryData(moduleKeys.list(workspaceId));
      const previousHome = queryClient.getQueryData(homeKeys.detail(workspaceId));

      queryClient.setQueryData(
        moduleKeys.list(workspaceId),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((m) =>
              m.id === moduleId ? { ...m, isPinned } : m,
            ),
          };
        },
      );

      queryClient.setQueryData(
        homeKeys.detail(workspaceId),
        (old: WorkspaceHomeData | undefined) => {
          if (!old) return old;
          if (!isPinned) {
            return {
              ...old,
              pinnedModules: (old.pinnedModules || []).filter((m) => m.id !== moduleId),
            };
          }
          const alreadyIn = (old.pinnedModules || []).some((m) => m.id === moduleId);
          if (alreadyIn) return old;

          const prevModulesData = previousModules as { data: WorkspaceModule[] } | undefined;
          const targetMod = prevModulesData?.data?.find((m) => m.id === moduleId);

          const newPinned: HomePinnedModule = {
            id: moduleId,
            name: targetMod?.name || "Module",
            type: targetMod?.type || ModuleTypeEnum.BOARD,
            isPinned: true,
            color: targetMod?.color,
            badgeCount: undefined,
          };

          return {
            ...old,
            pinnedModules: [...(old.pinnedModules || []), newPinned],
          };
        },
      );

      return { previousModules, previousHome };
    },
    onError: (_, __, context) => {
      if (workspaceId) {
        if (context?.previousModules) {
          queryClient.setQueryData(moduleKeys.list(workspaceId), context.previousModules);
        }
        if (context?.previousHome) {
          queryClient.setQueryData(homeKeys.detail(workspaceId), context.previousHome);
        }
      }
    },
    onSettled: () => {
      if (!workspaceId) return;
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: homeKeys.all });
    },
  });
}


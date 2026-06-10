import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceProject, CreateProjectPayload, UpdateProjectPayload } from "@crwsync/types";
import { api } from "@/services/auth.service";

export const projectKeys = {
  all: ["projects"] as const,
  list: (workspaceId: string) => [...projectKeys.all, "list", workspaceId] as const,
};

const projectService = {
  getWorkspaceProjects: async (workspaceId: string) => {
    const response = await api.get<{ data: WorkspaceProject[] }>(`/workspaces/${workspaceId}/projects`);
    return response.data;
  },
  createProject: async (workspaceId: string, data: CreateProjectPayload) => {
    const response = await api.post<{ data: WorkspaceProject }>(`/workspaces/${workspaceId}/projects`, data);
    return response.data;
  },
  updateProject: async (workspaceId: string, projectId: string, data: UpdateProjectPayload) => {
    const response = await api.patch<{ data: WorkspaceProject }>(`/workspaces/${workspaceId}/projects/${projectId}`, data);
    return response.data;
  },
  deleteProject: async (workspaceId: string, projectId: string) => {
    const response = await api.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
    return response.data;
  },
};

export function useWorkspaceProjects(workspaceId?: string) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId!),
    queryFn: () => projectService.getWorkspaceProjects(workspaceId!),
    enabled: !!workspaceId,
    select: (result) => result.data,
  });
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectPayload) => projectService.createProject(workspaceId, data),
    onSuccess: (res) => {
      queryClient.setQueryData(
        projectKeys.list(workspaceId),
        (old: { data: WorkspaceProject[] } | undefined) => {
          if (!old?.data) return old;
          return { ...old, data: [...old.data, res.data] };
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
    },
  });
}

export function useUpdateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateProjectPayload }) =>
      projectService.updateProject(workspaceId, projectId, data),
    onMutate: async ({ projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.list(workspaceId) });
      const previous = queryClient.getQueryData(projectKeys.list(workspaceId));

      queryClient.setQueryData(
        projectKeys.list(workspaceId),
        (old: { data: WorkspaceProject[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p) => (p.id === projectId ? { ...p, ...data } : p)),
          };
        }
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.list(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
    },
  });
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectService.deleteProject(workspaceId, projectId),
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.list(workspaceId) });
      const previous = queryClient.getQueryData(projectKeys.list(workspaceId));

      queryClient.setQueryData(
        projectKeys.list(workspaceId),
        (old: { data: WorkspaceProject[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((p) => p.id !== projectId),
          };
        }
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.list(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
      // Modules might have been deleted, invalidate modules too
      queryClient.invalidateQueries({ queryKey: ["modules", "list", workspaceId] });
    },
  });
}

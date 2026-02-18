"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateWorkspacePayload, UpdateWorkspacePayload } from "@crwsync/types";
import { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, getWorkspaceMembers } from "@/services/workspace.service";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  detail: (id: string) => [...workspaceKeys.all, "detail", id] as const,
  members: (id: string) => [...workspaceKeys.all, "members", id] as const,
};

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: async () => {
      const { success, data } = await getWorkspaceMembers(workspaceId);
      if (!success || !data) throw new Error("Failed to fetch workspace members");
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const { success, data } = await getWorkspaces();
      if (!success || !data) throw new Error("Failed to fetch workspaces");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useWorkspace(workspaceId: string | undefined | null) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId!),
    queryFn: async () => {
      const { success, data } = await getWorkspace(workspaceId!);
      if (!success || !data) throw new Error("Failed to fetch workspace");
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: CreateWorkspacePayload) => {
      const { success, data, message } = await createWorkspace(payload);
      if (!success || !data) throw new Error(message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      router.push(`/${data.slug}`);
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkspacePayload }) => {
      const { success, data: result, message } = await updateWorkspace(id, data);
      if (!success || !result) throw new Error(message);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}
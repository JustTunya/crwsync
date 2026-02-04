"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getWorkspaces, 
  getWorkspace, 
  createWorkspace as apiCreateWorkspace,
  updateWorkspace as apiUpdateWorkspace,
  deleteWorkspace as apiDeleteWorkspace,
  inviteMember as apiInviteMember
} from "@/services/workspace.service";
import { api } from "@/services/auth.service";
import { CreateWorkspacePayload, UpdateWorkspacePayload, InviteMemberPayload, WorkspaceRoleEnum } from "@crwsync/types";
import { useRouter, useSearchParams } from "next/navigation";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  detail: (id: string) => [...workspaceKeys.all, "detail", id] as const,
};

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
      const { success, data, message } = await apiCreateWorkspace(payload);
      if (!success || !data) throw new Error(message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      router.replace(`?ws=${data.id}`);
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkspacePayload }) => {
      const { success, data: result, message } = await apiUpdateWorkspace(id, data);
      if (!success || !result) throw new Error(message);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

// Additional mutations (delete, invite, etc.) can be added here following the same pattern

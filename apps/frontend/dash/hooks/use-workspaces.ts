"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateWorkspacePayload, UpdateWorkspacePayload, WorkspaceRoleEnum } from "@crwsync/types";
import {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
  transferOwnership,
} from "@/services/workspace.service";

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

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (id: string) => {
      const { success, message } = await deleteWorkspace(id);
      if (!success) throw new Error(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      router.push("/");
    },
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: WorkspaceRoleEnum }) => {
      const { success, message } = await updateMemberRole(workspaceId, memberId, role);
      if (!success) throw new Error(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
  });
}

export function useTransferOwnership(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOwnerId: string) => {
      const { success, message } = await transferOwnership(workspaceId, newOwnerId);
      if (!success) throw new Error(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
  });
}

export function useWorkspaceRole(workspaceId: string | undefined, userId: string | undefined) {
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId ?? "");

  const self = useMemo(() => members?.find((m) => m.user_id === userId), [members, userId]);

  return {
    role: self?.role ?? null,
    isOwner: self?.role === WorkspaceRoleEnum.OWNER,
    isAdmin: self?.role === WorkspaceRoleEnum.OWNER || self?.role === WorkspaceRoleEnum.ADMIN,
    isLoading,
  };
}
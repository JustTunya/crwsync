"use client";

import { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Workspace, WorkspaceMember, CreateWorkspacePayload } from "@crwsync/types";
import { useWorkspaces, useWorkspace as useWorkspaceQuery, useCreateWorkspace, workspaceKeys } from "@/hooks/use-workspaces";

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: WorkspaceMember[];
  loading: { list: boolean; active: boolean; mutation: boolean; };
  createWorkspace: (data: CreateWorkspacePayload) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = "crw-ws";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading: listLoading } = useWorkspaces();

  const urlId = params?.get("ws");
  
  const activeIdFromUrl = urlId;
  
  const resolveActiveId = useCallback(() => {
    if (activeIdFromUrl) return activeIdFromUrl;
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
    }
    return null;
  }, [activeIdFromUrl]);

  const candidateId = resolveActiveId();

  const validId = useMemo(() => {
    if (!workspaces.length) return null;
    if (candidateId && workspaces.some(w => w.workspace_id === candidateId)) return candidateId;
    return workspaces[0].workspace_id;
  }, [workspaces, candidateId]);

  const { data: activeWorkspace = null, isLoading: activeLoading } = useWorkspaceQuery(validId);

  useEffect(() => {
    if (validId) {
       localStorage.setItem(STORAGE_KEY, validId);
    }
  }, [validId]);

  const createMutation = useCreateWorkspace();

  const createWorkspace = useCallback(async (payload: CreateWorkspacePayload) => {
    await createMutation.mutateAsync(payload);
  }, [createMutation]);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    localStorage.setItem(STORAGE_KEY, workspaceId);
    router.push(`?ws=${workspaceId}`);
  }, [router]);

  const refreshWorkspaces = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      loading: {
        list: listLoading,
        active: activeLoading,
        mutation: createMutation.isPending
      },
      createWorkspace,
      switchWorkspace,
      refreshWorkspaces
    }),
    [workspaces, activeWorkspace, listLoading, activeLoading, createMutation.isPending, createWorkspace, switchWorkspace, refreshWorkspaces]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
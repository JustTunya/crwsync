"use client";

import { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Workspace, WorkspaceMember, CreateWorkspacePayload } from "@crwsync/types";
import { useWorkspaces, useWorkspace as useWorkspaceQuery, useCreateWorkspace, workspaceKeys } from "@/hooks/use-workspaces";

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: WorkspaceMember[];
  loading: { list: boolean; active: boolean; mutation: boolean; };
  createWorkspace: (data: CreateWorkspacePayload) => Promise<void>;
  switchWorkspace: (workspaceSlug: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = "crw-ws";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams(); // { slug: string }
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading: listLoading } = useWorkspaces();

  // 1. Determine candidate slug from URL
  const slugFromUrl = params?.slug as string | undefined;

  // 2. Resolve to a valid workspace ID if possible
  const validMember = useMemo(() => {
    if (!workspaces.length) return null;
    if (slugFromUrl) {
      const match = workspaces.find((w) => w.workspace?.slug === slugFromUrl);
      if (match) return match;
    }
    // Fallback? If we are on a slug route but it does not match, we might want to redirect?
    // But this provider is inside layout. If slug is invalid, maybe 404?
    // For now, if no match, we return null.
    // If we are NOT on a slug route (unlikely given layout structure), we might fallback to first.
    return null; 
  }, [workspaces, slugFromUrl]);

  const activeId = validMember?.workspace_id;

  // 3. Fetch full details for the active workspace
  const { data: activeWorkspace = null, isLoading: activeLoading } = useWorkspaceQuery(activeId);

  // 4. Persistence (optional now, since URL assumes source of truth)
  useEffect(() => {
    if (activeWorkspace) {
       localStorage.setItem(STORAGE_KEY, activeWorkspace.id); // Maybe store slug instead?
    }
  }, [activeWorkspace]);

  const createMutation = useCreateWorkspace();

  const createWorkspace = useCallback(async (payload: CreateWorkspacePayload) => {
    await createMutation.mutateAsync(payload);
  }, [createMutation]);

  const switchWorkspace = useCallback(async (workspaceSlug: string) => {
    router.push(`/${workspaceSlug}`);
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
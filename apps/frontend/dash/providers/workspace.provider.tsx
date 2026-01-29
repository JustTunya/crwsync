"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  getWorkspaces, 
  getWorkspace, 
  createWorkspace as apiCreateWorkspace,  
} from "@/services/workspace.service";
import { Workspace, WorkspaceMember, CreateWorkspacePayload } from "@crwsync/types";

interface WorkspaceContextType {
  workspaces: WorkspaceMember[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  createWorkspace: (data: CreateWorkspacePayload) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = "crwsync_active_workspace_id";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceMember[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchActiveWorkspaceDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { success, data } = await getWorkspace(id);
      if (success && data) {
        setActiveWorkspace(data);
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        setActiveWorkspace(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error("Failed to fetch active workspace", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true);
    const { success, data } = await getWorkspaces();
    
    if (success && data) {
      setWorkspaces(data);

      const storedId = localStorage.getItem(STORAGE_KEY);
      const urlId = searchParams?.get("ws"); // Allow overriding via ?ws=UUID

      const targetId = urlId || storedId;

      const isValidTarget = data.some((w) => w.workspace_id === targetId);

      if (isValidTarget && targetId) {
        await fetchActiveWorkspaceDetails(targetId);
      } else if (data.length > 0) {
        await fetchActiveWorkspaceDetails(data[0].workspace_id);
      } else {
        setActiveWorkspace(null);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [fetchActiveWorkspaceDetails, searchParams]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) return;
    await fetchActiveWorkspaceDetails(workspaceId);
    router.refresh();
  };

  const createWorkspace = async (payload: CreateWorkspacePayload) => {
    setIsLoading(true);
    const { success, data } = await apiCreateWorkspace(payload);
    
    if (success && data) {
      await refreshWorkspaces();
      await switchWorkspace(data.id);
    }
    setIsLoading(false);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoading,
        createWorkspace,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
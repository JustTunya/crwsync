"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Workspace, WorkspaceMember, CreateWorkspacePayload } from "@crwsync/types";
import { getWorkspaces, getWorkspace, createWorkspace as apiCreateWorkspace } from "@/services/workspace.service";

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

  const [workspaces, setWorkspaces] = useState<WorkspaceMember[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const [loading, setLoading] = useState({ list: true, active: false, mutation: false });

  const reqIdRef = useRef(0); // To prevent race conditions

  const fetchWorkspace = useCallback(async (workspaceId: string) => {
    const requestId = ++reqIdRef.current;

    setLoading((s) => ({ ...s, active: true }));

    try {
      const { success, data } = await getWorkspace(workspaceId);

      if (requestId !== reqIdRef.current) return;

      if (success && data) {
        setActiveWorkspace(data);
        localStorage.setItem(STORAGE_KEY, data.id);
      } else {
        setActiveWorkspace(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } finally {
      if (requestId === reqIdRef.current) {
        setLoading((s) => ({ ...s, active: false }));
      }
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    setLoading((s) => ({ ...s, list: true }));

    const { success, data } = await getWorkspaces();

    if (!success || !data) {
      setLoading((s) => ({ ...s, list: false }));
      return;
    }

    setWorkspaces(data);

    const urlId = params?.get("ws");
    const storedId = localStorage.getItem(STORAGE_KEY);
    const candidateId = urlId || storedId;

    const valid = candidateId && data.some((w) => w.workspace_id === candidateId);

    if (valid) {
      await fetchWorkspace(candidateId);
    } else if (data.length > 0) {
      await fetchWorkspace(data[0].workspace_id);
    } else {
      setActiveWorkspace(null);
    }

    setLoading((s) => ({ ...s, list: false }));
  }, [params, fetchWorkspace]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === activeWorkspace?.id) return;
      await fetchWorkspace(workspaceId);
    },
    [activeWorkspace?.id, fetchWorkspace]
  );

  const createWorkspace = useCallback(
    async (payload: CreateWorkspacePayload) => {
      setLoading((s) => ({ ...s, mutation: true }));

      const { success, data } = await apiCreateWorkspace(payload);

      if (success && data) {
        await refreshWorkspaces();
        await fetchWorkspace(data.id);
        router.replace(`?ws=${data.id}`);
      }

      setLoading((s) => ({ ...s, mutation: false }));
    },
    [refreshWorkspaces, fetchWorkspace, router]
  );

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const value = useMemo(
    () => ({ workspaces, activeWorkspace, loading, createWorkspace, switchWorkspace, refreshWorkspaces }),
    [workspaces, activeWorkspace, loading, createWorkspace, switchWorkspace, refreshWorkspaces]
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
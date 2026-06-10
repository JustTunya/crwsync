"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket.provider";
import { moduleKeys } from "@/hooks/use-workspace-modules";
import { projectKeys } from "@/hooks/use-workspace-projects";
import type { WorkspaceModule, WorkspaceProject } from "@crwsync/types";

// ---------------------------------------------------------------------------
// Payload types matching board.service.ts emissions
// ---------------------------------------------------------------------------

type ModuleCreatedPayload = WorkspaceModule;

interface ModuleUpdatedPayload {
  moduleId: string;
  data: Partial<WorkspaceModule>;
}

// backend emits { referenceId } for board deletions, { moduleId } for others
interface ModuleDeletedPayload {
  moduleId?: string;
  referenceId?: string;
}

interface ModuleReorderedPayload {
  updates: Array<{ id: string; position: number; project_id?: string | null }>;
}

type ProjectCreatedPayload = WorkspaceProject;

interface ProjectUpdatedPayload {
  projectId: string;
  data: Partial<WorkspaceProject>;
}

interface ProjectDeletedPayload {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Cache shape helpers
// ---------------------------------------------------------------------------

type ModuleCache = { data: WorkspaceModule[] } | undefined;
type ProjectCache = { data: WorkspaceProject[] } | undefined;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to all workspace-level WebSocket events (modules & projects) and
 * patches the React-Query caches so the sidebar stays real-time for every
 * connected member without a page refresh.
 *
 * This hook is intentionally kept outside of individual page components so it
 * remains active even when the user navigates between boards/chats.
 */
export function useWorkspaceSocket(workspaceId: string | undefined) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !workspaceId) return;

    // ── module:created ──────────────────────────────────────────────────
    const onModuleCreated = (wsModule: ModuleCreatedPayload) => {
      queryClient.setQueryData<ModuleCache>(
        moduleKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          // Idempotency: skip if already present (own mutation already added it)
          if (old.data.some((m) => m.id === wsModule.id)) return old;
          return { ...old, data: [...old.data, wsModule] };
        },
      );
    };

    // ── module:updated ──────────────────────────────────────────────────
    const onModuleUpdated = ({ moduleId, data }: ModuleUpdatedPayload) => {
      queryClient.setQueryData<ModuleCache>(
        moduleKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((m) =>
              m.id === moduleId ? { ...m, ...data } : m,
            ),
          };
        },
      );
    };

    // ── module:deleted ──────────────────────────────────────────────────
    const onModuleDeleted = ({ moduleId, referenceId }: ModuleDeletedPayload) => {
      queryClient.setQueryData<ModuleCache>(
        moduleKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((m) => {
              if (moduleId) return m.id !== moduleId;
              if (referenceId) return m.reference_id !== referenceId;
              return true;
            }),
          };
        },
      );
    };

    // ── module:reordered ────────────────────────────────────────────────
    const onModuleReordered = ({ updates }: ModuleReorderedPayload) => {
      queryClient.setQueryData<ModuleCache>(
        moduleKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          const moduleMap = new Map(old.data.map((m) => [m.id, m]));

          updates.forEach(({ id, position, project_id }) => {
            const mod = moduleMap.get(id);
            if (mod) {
              moduleMap.set(id, {
                ...mod,
                position: position * 1000,
                project_id: project_id ?? null,
              });
            }
          });

          const reordered = Array.from(moduleMap.values()).sort(
            (a, b) => a.position - b.position,
          );
          return { ...old, data: reordered };
        },
      );
    };

    // ── project:created ─────────────────────────────────────────────────
    const onProjectCreated = (project: ProjectCreatedPayload) => {
      queryClient.setQueryData<ProjectCache>(
        projectKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          if (old.data.some((p) => p.id === project.id)) return old;
          return {
            ...old,
            data: [...old.data, project].sort((a, b) => a.position - b.position),
          };
        },
      );
    };

    // ── project:updated ─────────────────────────────────────────────────
    const onProjectUpdated = ({ projectId, data }: ProjectUpdatedPayload) => {
      queryClient.setQueryData<ProjectCache>(
        projectKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p) =>
              p.id === projectId ? { ...p, ...data } : p,
            ),
          };
        },
      );
    };

    // ── project:deleted ─────────────────────────────────────────────────
    const onProjectDeleted = ({ projectId }: ProjectDeletedPayload) => {
      queryClient.setQueryData<ProjectCache>(
        projectKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((p) => p.id !== projectId),
          };
        },
      );
      // Also remove any modules that belonged to this project from the cache
      queryClient.setQueryData<ModuleCache>(
        moduleKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((m) => m.project_id !== projectId),
          };
        },
      );
    };

    // Register
    socket.on("module:created", onModuleCreated);
    socket.on("module:updated", onModuleUpdated);
    socket.on("module:deleted", onModuleDeleted);
    socket.on("module:reordered", onModuleReordered);
    socket.on("project:created", onProjectCreated);
    socket.on("project:updated", onProjectUpdated);
    socket.on("project:deleted", onProjectDeleted);

    return () => {
      socket.off("module:created", onModuleCreated);
      socket.off("module:updated", onModuleUpdated);
      socket.off("module:deleted", onModuleDeleted);
      socket.off("module:reordered", onModuleReordered);
      socket.off("project:created", onProjectCreated);
      socket.off("project:updated", onProjectUpdated);
      socket.off("project:deleted", onProjectDeleted);
    };
  }, [socket, workspaceId, queryClient]);
}

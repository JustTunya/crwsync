"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Board, BoardColumn, Task } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";
import { boardKeys } from "@/hooks/use-boards";
import { moduleKeys } from "@/hooks/use-workspace-modules";

// ---------------------------------------------------------------------------
// Types for incoming socket payloads
// ---------------------------------------------------------------------------

interface TaskCreatedPayload {
  boardId: string;
  task: Task;
}

interface TaskUpdatedPayload {
  boardId: string;
  taskId: string;
  data: Partial<Task>;
}

interface TaskMovedPayload {
  boardId: string;
  taskId: string;
  fromColumnId: string;
  toColumnId: string;
  position: number;
  userId: string;
}

interface ColumnCreatedPayload {
  boardId: string;
  column: BoardColumn;
}

interface ColumnUpdatedPayload {
  boardId: string;
  columnId: string;
  data: Partial<BoardColumn>;
}

interface ColumnDeletedPayload {
  boardId: string;
  columnId: string;
}

interface ColumnsReorderedPayload {
  boardId: string;
  columnIds: string[];
}

interface BoardUpdatedPayload {
  boardId: string;
  data: Partial<Board>;
}

interface BoardDeletedPayload {
  boardId: string;
}

// ---------------------------------------------------------------------------
// Cache shape helpers
// ---------------------------------------------------------------------------

type BoardCache = { data: Board } | undefined;

function patchBoardCache(
  old: BoardCache,
  updater: (board: Board) => Board,
): BoardCache {
  if (!old?.data) return old;
  return { ...old, data: updater(old.data) };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to all board-scoped WebSocket events emitted by the backend's
 * StatusGateway and applies them as surgical React-Query cache patches.
 *
 * Rules:
 * - Events scoped to a different boardId are ignored.
 * - Events caused by the current user are no-ops where an optimistic update
 *   was already applied (idempotency check prevents double-apply).
 * - `board:task:moved` from a remote user triggers a full invalidation
 *   because the payload is positional-only (not a full Task object).
 * - On socket reconnect the board cache is invalidated to recover missed events.
 */
export function useBoardSocket(workspaceId: string, boardId: string) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const user = useUser();

  useEffect(() => {
    if (!socket || !boardId || !workspaceId) return;

    const currentUserId = user?.id;

    // ----- board:task:created -------------------------------------------
    const onTaskCreated = ({ boardId: bId, task }: TaskCreatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => {
            // Idempotency: skip if we already have this task (own optimistic)
            const alreadyExists = board.columns?.some((col) =>
              col.tasks?.some((t) => t.id === task.id),
            );
            if (alreadyExists) return board;

            const columns = (board.columns ?? []).map((col) =>
              col.id === task.column_id
                ? { ...col, tasks: [...(col.tasks ?? []), task] }
                : col,
            );
            return { ...board, columns };
          }),
      );
    };

    // ----- board:task:updated -------------------------------------------
    const onTaskUpdated = ({ boardId: bId, taskId, data }: TaskUpdatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => {
            const columns = (board.columns ?? []).map((col) => ({
              ...col,
              tasks: (col.tasks ?? []).map((t) =>
                t.id === taskId ? { ...t, ...data } : t,
              ),
            }));
            return { ...board, columns };
          }),
      );
    };

    // ----- board:task:moved ---------------------------------------------
    // The payload carries only positional metadata, not the full task state.
    // For the acting user, the optimistic update already moved the card.
    // For everyone else, the safest path is a full re-fetch.
    const onTaskMoved = ({ boardId: bId, userId }: TaskMovedPayload) => {
      if (bId !== boardId) return;
      if (userId === currentUserId) return; // own action – optimistic already applied

      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    };

    // ----- board:column:created -----------------------------------------
    const onColumnCreated = ({ boardId: bId, column }: ColumnCreatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => {
            const alreadyExists = (board.columns ?? []).some(
              (c) => c.id === column.id,
            );
            if (alreadyExists) return board;
            return {
              ...board,
              columns: [...(board.columns ?? []), { ...column, tasks: [] }],
            };
          }),
      );
    };

    // ----- board:column:updated -----------------------------------------
    const onColumnUpdated = ({
      boardId: bId,
      columnId,
      data,
    }: ColumnUpdatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => ({
            ...board,
            columns: (board.columns ?? []).map((col) =>
              col.id === columnId ? { ...col, ...data } : col,
            ),
          })),
      );
    };

    // ----- board:column:deleted -----------------------------------------
    const onColumnDeleted = ({ boardId: bId, columnId }: ColumnDeletedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => ({
            ...board,
            columns: (board.columns ?? []).filter((c) => c.id !== columnId),
          })),
      );
    };

    // ----- board:columns:reordered --------------------------------------
    const onColumnsReordered = ({
      boardId: bId,
      columnIds,
    }: ColumnsReorderedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => {
            const columnMap = new Map(
              (board.columns ?? []).map((c) => [c.id, c]),
            );
            const reordered = columnIds
              .map((id) => columnMap.get(id))
              .filter((c): c is BoardColumn => !!c);
            return { ...board, columns: reordered };
          }),
      );
    };

    // ----- board:updated ------------------------------------------------
    const onBoardUpdated = ({ boardId: bId, data }: BoardUpdatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) => patchBoardCache(old, (board) => ({ ...board, ...data })),
      );

      // Also keep the module list name in sync (sidebar)
      if (data.name && workspaceId) {
        queryClient.setQueryData(
          moduleKeys.list(workspaceId),
          (old: { data: { reference_id: string | null; name: string }[] } | undefined) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: old.data.map((m) =>
                m.reference_id === boardId ? { ...m, name: data.name! } : m,
              ),
            };
          },
        );
      }
    };

    // ----- board:deleted ------------------------------------------------
    const onBoardDeleted = ({ boardId: bId }: BoardDeletedPayload) => {
      if (bId !== boardId) return;

      queryClient.removeQueries({ queryKey: boardKeys.detail(boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.list(workspaceId) });
    };

    // ----- reconnect: recover missed events -----------------------------
    const onReconnect = () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    };

    // Register all listeners
    socket.on("board:task:created", onTaskCreated);
    socket.on("board:task:updated", onTaskUpdated);
    socket.on("board:task:moved", onTaskMoved);
    socket.on("board:column:created", onColumnCreated);
    socket.on("board:column:updated", onColumnUpdated);
    socket.on("board:column:deleted", onColumnDeleted);
    socket.on("board:columns:reordered", onColumnsReordered);
    socket.on("board:updated", onBoardUpdated);
    socket.on("board:deleted", onBoardDeleted);
    socket.io.on("reconnect", onReconnect);

    return () => {
      socket.off("board:task:created", onTaskCreated);
      socket.off("board:task:updated", onTaskUpdated);
      socket.off("board:task:moved", onTaskMoved);
      socket.off("board:column:created", onColumnCreated);
      socket.off("board:column:updated", onColumnUpdated);
      socket.off("board:column:deleted", onColumnDeleted);
      socket.off("board:columns:reordered", onColumnsReordered);
      socket.off("board:updated", onBoardUpdated);
      socket.off("board:deleted", onBoardDeleted);
      socket.io.off("reconnect", onReconnect);
    };
  }, [socket, boardId, workspaceId, queryClient, user?.id]);
}
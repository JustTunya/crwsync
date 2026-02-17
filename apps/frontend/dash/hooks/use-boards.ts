import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Board,
  CreateBoardPayload,
  UpdateBoardPayload,
  CreateColumnPayload,
  UpdateColumnPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
  ReorderColumnsPayload,
} from "@crwsync/types";
import * as boardService from "@/services/board.service";
import { moduleKeys } from "@/hooks/use-workspace-modules";

export const boardKeys = {
  all: ["boards"] as const,
  list: (workspaceId: string) =>
    [...boardKeys.all, "list", workspaceId] as const,
  detail: (boardId: string) => [...boardKeys.all, "detail", boardId] as const,
};

export function useBoards(workspaceId?: string) {
  return useQuery({
    queryKey: boardKeys.list(workspaceId!),
    queryFn: () => boardService.getBoards(workspaceId!),
    enabled: !!workspaceId,
    select: (result) => result.data,
  });
}

export function useBoard(workspaceId?: string, boardId?: string) {
  return useQuery({
    queryKey: boardKeys.detail(boardId!),
    queryFn: () => boardService.getBoard(workspaceId!, boardId!),
    enabled: !!workspaceId && !!boardId,
    select: (result) => result.data,
  });
}

export function useCreateBoard(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBoardPayload) =>
      boardService.createBoard(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

export function useUpdateBoard(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      data,
    }: {
      boardId: string;
      data: UpdateBoardPayload;
    }) => boardService.updateBoard(workspaceId, boardId, data),
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

export function useDeleteBoard(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) =>
      boardService.deleteBoard(workspaceId, boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

export function useCreateColumn(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateColumnPayload) =>
      boardService.createColumn(workspaceId, boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useUpdateColumn(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      data,
    }: {
      columnId: string;
      data: UpdateColumnPayload;
    }) => boardService.updateColumn(workspaceId, boardId, columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useDeleteColumn(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) =>
      boardService.deleteColumn(workspaceId, boardId, columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useReorderColumns(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderColumnsPayload) =>
      boardService.reorderColumns(workspaceId, boardId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          const columnMap = new Map(old.data.columns.map((c) => [c.id, c]));
          const reordered = data.column_ids
            .map((id) => columnMap.get(id))
            .filter(Boolean);
          return { ...old, data: { ...old.data, columns: reordered } };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useCreateTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskPayload & { column_id: string }) =>
      boardService.createTask(workspaceId, boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useUpdateTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskPayload;
    }) => boardService.updateTask(workspaceId, boardId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useDeleteTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      boardService.deleteTask(workspaceId, boardId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useMoveTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: MoveTaskPayload }) =>
      boardService.moveTask(workspaceId, boardId, taskId, data),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;

          const columns = old.data.columns.map((col) => ({
            ...col,
            tasks: col.tasks ? col.tasks.filter((t) => t.id !== taskId) : [],
          }));

          const targetCol = columns.find((c) => c.id === data.column_id);
          if (targetCol && targetCol.tasks) {
            const movedTask = old.data.columns
              .flatMap((c) => c.tasks || [])
              .find((t) => t.id === taskId);
            if (movedTask) {
              targetCol.tasks.splice(data.position, 0, {
                ...movedTask,
                column_id: data.column_id,
              });
            }
          }

          return { ...old, data: { ...old.data, columns } };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

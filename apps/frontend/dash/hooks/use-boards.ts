import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Board,
  CreateBoardPayload,
  CreateColumnPayload,
  UpdateColumnPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
  CreateTaskChecklistItemPayload,
  UpdateTaskChecklistItemPayload,
} from "@crwsync/types";
import * as boardService from "@/services/board.service";
import { uploadToPresignedUrl } from "@/lib/upload-to-storage";
import { boardKeys, moduleKeys } from "@/hooks/query-keys";
export { boardKeys } from "@/hooks/query-keys";

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
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t))
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useDeleteTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      boardService.deleteTask(workspaceId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks ? col.tasks.filter((t) => t.id !== taskId) : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useArchiveTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      boardService.archiveTask(workspaceId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) => (t.id === taskId ? { ...t, is_archived: true } : t))
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
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
  });
}

export function useUploadTaskAttachment(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const { success, data: presign, message } = await boardService.presignTaskAttachment(
        workspaceId,
        taskId,
        file.type || "application/octet-stream",
        file.name,
      );
      if (!success || !presign) throw new Error(message);

      await uploadToPresignedUrl(presign, file);

      const { success: createSuccess, data: attachment, message: createMessage } =
        await boardService.createTaskAttachment(workspaceId, taskId, {
          key: presign.key,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
        });
      if (!createSuccess || !attachment) throw new Error(createMessage);

      return { taskId, attachment };
    },
    onSuccess: ({ taskId, attachment }) => {
      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, attachments: [...(t.attachments ?? []), attachment] }
                        : t,
                    )
                  : [],
              })),
            },
          };
        },
      );
    },
  });
}

export function useDeleteTaskAttachment(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      boardService.deleteTaskAttachment(workspaceId, taskId, attachmentId),
    onMutate: async ({ taskId, attachmentId }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, attachments: (t.attachments ?? []).filter((a) => a.id !== attachmentId) }
                        : t,
                    )
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
  });
}

export function useCreateChecklistItem(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: CreateTaskChecklistItemPayload }) => {
      const { success, data: item, message } = await boardService.createChecklistItem(workspaceId, taskId, data);
      if (!success || !item) throw new Error(message);
      return { taskId, item };
    },
    onSuccess: ({ taskId, item }) => {
      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) => {
                      if (t.id !== taskId) return t;
                      if ((t.checklistItems ?? []).some((i) => i.id === item.id)) return t;
                      return { ...t, checklistItems: [...(t.checklistItems ?? []), item] };
                    })
                  : [],
              })),
            },
          };
        },
      );
    },
  });
}

export function useUpdateChecklistItem(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, itemId, data }: { taskId: string; itemId: string; data: UpdateTaskChecklistItemPayload }) =>
      boardService.updateChecklistItem(workspaceId, taskId, itemId, data),
    onMutate: async ({ taskId, itemId, data }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) =>
                      t.id === taskId
                        ? {
                            ...t,
                            checklistItems: (t.checklistItems ?? []).map((i) =>
                              i.id === itemId ? { ...i, ...data } : i,
                            ),
                          }
                        : t,
                    )
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
  });
}

export function useDeleteChecklistItem(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, itemId }: { taskId: string; itemId: string }) =>
      boardService.deleteChecklistItem(workspaceId, taskId, itemId),
    onMutate: async ({ taskId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: col.tasks
                  ? col.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, checklistItems: (t.checklistItems ?? []).filter((i) => i.id !== itemId) }
                        : t,
                    )
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
  });
}

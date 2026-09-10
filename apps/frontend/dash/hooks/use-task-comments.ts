import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Board, TaskCommentPage, CreateTaskCommentPayload, UpdateTaskCommentPayload } from "@crwsync/types";
import * as boardService from "@/services/board.service";
import { commentKeys, boardKeys } from "@/hooks/query-keys";

export function useTaskComments(workspaceId?: string, taskId?: string) {
  return useQuery({
    queryKey: commentKeys.list(taskId!),
    queryFn: () => boardService.getTaskComments(workspaceId!, taskId!),
    enabled: !!workspaceId && !!taskId,
    select: (result) => result.data,
  });
}

export function useLoadOlderComments(workspaceId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cursor: string) => {
      const { success, data, message } = await boardService.getTaskComments(workspaceId, taskId, cursor);
      if (!success || !data) throw new Error(message);
      return data;
    },
    onSuccess: (olderPage) => {
      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          const existingIds = new Set(old.data.comments.map((c) => c.id));
          const merged = [...olderPage.comments.filter((c) => !existingIds.has(c.id)), ...old.data.comments];
          return {
            ...old,
            data: { comments: merged, next_cursor: olderPage.next_cursor, has_more: olderPage.has_more },
          };
        },
      );
    },
  });
}

export function useCreateTaskComment(workspaceId: string, boardId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskCommentPayload) => {
      const { success, data: comment, message } = await boardService.createTaskComment(workspaceId, taskId, data);
      if (!success || !comment) throw new Error(message);
      return comment;
    },
    onSuccess: (comment) => {
      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          if (old.data.comments.some((c) => c.id === comment.id)) return old;
          return { ...old, data: { ...old.data, comments: [...old.data.comments, comment] } };
        },
      );

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
                tasks: (col.tasks ?? []).map((t) =>
                  t.id === taskId
                    ? { ...t, _count: { comments: (t._count?.comments ?? 0) + 1 } }
                    : t,
                ),
              })),
            },
          };
        },
      );
    },
  });
}

export function useEditTaskComment(workspaceId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, data }: { commentId: string; data: UpdateTaskCommentPayload }) => {
      const { success, data: comment, message } = await boardService.updateTaskComment(
        workspaceId,
        taskId,
        commentId,
        data,
      );
      if (!success || !comment) throw new Error(message);
      return comment;
    },
    onSuccess: (comment) => {
      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: { ...old.data, comments: old.data.comments.map((c) => (c.id === comment.id ? comment : c)) },
          };
        },
      );
    },
  });
}

export function useDeleteTaskComment(workspaceId: string, boardId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { success, message } = await boardService.deleteTaskComment(workspaceId, taskId, commentId);
      if (!success) throw new Error(message);
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(taskId) });
      const previousComments = queryClient.getQueryData(commentKeys.list(taskId));
      const previousBoard = queryClient.getQueryData(boardKeys.detail(boardId));

      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              comments: old.data.comments.map((c) =>
                c.id === commentId ? { ...c, is_deleted: true, content: "This comment was deleted." } : c,
              ),
            },
          };
        },
      );

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
                tasks: (col.tasks ?? []).map((t) =>
                  t.id === taskId
                    ? { ...t, _count: { comments: Math.max(0, (t._count?.comments ?? 1) - 1) } }
                    : t,
                ),
              })),
            },
          };
        },
      );

      return { previousComments, previousBoard };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(commentKeys.list(taskId), context.previousComments);
      }
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previousBoard);
      }
    },
  });
}

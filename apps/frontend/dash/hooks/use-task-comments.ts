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

export function useCreateTaskComment(workspaceId: string, boardId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskCommentPayload) =>
      boardService.createTaskComment(workspaceId, taskId, data),
    onSuccess: ({ success, data: comment }) => {
      if (!success || !comment) return;

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
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateTaskCommentPayload }) =>
      boardService.updateTaskComment(workspaceId, taskId, commentId, data),
    onSuccess: ({ success, data: comment }) => {
      if (!success || !comment) return;
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
    mutationFn: (commentId: string) => boardService.deleteTaskComment(workspaceId, taskId, commentId),
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(taskId) });
      const previous = queryClient.getQueryData(commentKeys.list(taskId));

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

      return { previous };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commentKeys.list(taskId), context.previous);
      }
    },
  });
}

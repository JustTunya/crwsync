import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateFileRoomPayload, WorkspaceFile } from "@crwsync/types";
import * as filesService from "@/services/files.service";
import { moduleKeys } from "@/hooks/use-workspace-modules";

export const fileKeys = {
  all: ["files"] as const,
  room: (roomId: string) => [...fileKeys.all, "room", roomId] as const,
  list: (roomId: string) => [...fileKeys.all, "list", roomId] as const,
};

export function useFileRoom(workspaceId?: string, roomId?: string) {
  return useQuery({
    queryKey: fileKeys.room(roomId!),
    queryFn: () => filesService.getFileRoom(workspaceId!, roomId!),
    enabled: !!workspaceId && !!roomId,
    select: (result) => result.data,
  });
}

export function useFiles(workspaceId?: string, roomId?: string) {
  return useQuery({
    queryKey: fileKeys.list(roomId!),
    queryFn: () => filesService.getFiles(workspaceId!, roomId!),
    enabled: !!workspaceId && !!roomId,
    select: (result) => result.data ?? [],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateFileRoom(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFileRoomPayload) =>
      filesService.createFileRoom(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

export function useDeleteFile(workspaceId: string, roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => filesService.deleteWorkspaceFile(workspaceId, roomId, fileId),
    onMutate: async (fileId: string) => {
      const previous = queryClient.getQueryData<{ data?: WorkspaceFile[] }>(fileKeys.list(roomId));
      queryClient.setQueryData<{ data?: WorkspaceFile[] }>(fileKeys.list(roomId), (old) =>
        old?.data ? { ...old, data: old.data.filter((f) => f.id !== fileId) } : old,
      );
      return { previous };
    },
    onError: (_err, _fileId, context) => {
      if (context?.previous) queryClient.setQueryData(fileKeys.list(roomId), context.previous);
    },
  });
}

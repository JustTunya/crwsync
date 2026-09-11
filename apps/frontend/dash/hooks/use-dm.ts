import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BoardOperationState, DmRoomSummary } from "@crwsync/types";
import * as dmService from "@/services/dm.service";

export const dmKeys = {
  all: ["dms"] as const,
  list: (workspaceId: string) => [...dmKeys.all, "list", workspaceId] as const,
};

export function useDirectMessages(workspaceId?: string) {
  return useQuery({
    queryKey: dmKeys.list(workspaceId!),
    queryFn: () => dmService.listDirectMessages(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    select: (result) => result.data,
  });
}

export function useOpenDirectMessage(workspaceId: string, slug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (otherUserId: string) =>
      dmService.openDirectMessage(workspaceId, { otherUserId }),
    onSuccess: (result) => {
      if (!result.success || !result.data) return;
      const room = result.data;

      queryClient.setQueryData<BoardOperationState<DmRoomSummary[]>>(
        dmKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((dm) =>
              dm.room.id === room.id ? { ...dm, unread: false } : dm,
            ),
          };
        },
      );

      router.push(`/${slug}/chat/${room.id}`);
    },
  });
}

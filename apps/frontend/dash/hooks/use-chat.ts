import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateChatRoomPayload } from "@crwsync/types";
import * as chatService from "@/services/chat.service";
import { moduleKeys } from "@/hooks/use-workspace-modules";

export const chatKeys = {
  all: ["chat"] as const,
  room: (roomId: string) => [...chatKeys.all, "room", roomId] as const,
  messages: (roomId: string) => [...chatKeys.all, "messages", roomId] as const,
};

export function useChatRoom(workspaceId?: string, roomId?: string) {
  return useQuery({
    queryKey: chatKeys.room(roomId!),
    queryFn: () => chatService.getChatRoom(workspaceId!, roomId!),
    enabled: !!workspaceId && !!roomId,
    select: (result) => result.data,
  });
}

export function useChatMessages(workspaceId?: string, roomId?: string) {
  return useQuery({
    queryKey: chatKeys.messages(roomId!),
    queryFn: () => chatService.getChatMessages(workspaceId!, roomId!),
    enabled: !!workspaceId && !!roomId,
    select: (result) => result.data,
  });
}

export function useCreateChatRoom(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChatRoomPayload) =>
      chatService.createChatRoom(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
    },
  });
}

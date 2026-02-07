import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceInvite } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";
import { getInvites } from "@/services/user.service";

export function useInvites() {
  const user = useUser();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["invites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { success, data } = await getInvites(user.id);
      return success && data ? data : [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!socket || !user) return;

    const handleInviteReceived = (newInvite: WorkspaceInvite) => {
      queryClient.setQueryData(["invites", user.id], (old: WorkspaceInvite[] = []) => {
        if (old.find((i) => i.id === newInvite.id)) return old;
        return [newInvite, ...old];
      });
    };

    const handleInviteHandled = ({ inviteId }: { inviteId: string; }) => {
      queryClient.setQueryData(["invites", user.id], (old: WorkspaceInvite[] = []) => {
        return old.filter((invite) => invite.id !== inviteId);
      });
    };

    socket.on("invite:received", handleInviteReceived);
    socket.on("invite:handled", handleInviteHandled);

    return () => {
      socket.off("invite:received", handleInviteReceived);
      socket.off("invite:handled", handleInviteHandled);
    };
  }, [socket, user, queryClient]);

  return { invites, isLoading };
}

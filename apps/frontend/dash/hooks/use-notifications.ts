import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppNotification, NotificationRecord } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/services/user.service";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (userId: string) => [...notificationKeys.all, userId] as const,
};

function toAppNotification(record: NotificationRecord): AppNotification {
  return {
    notificationId: record.id,
    isRead: record.is_read,
    createdAt: record.created_at,
    type: record.type,
    ...record.payload,
  } as AppNotification;
}

export function useNotifications() {
  const user = useUser();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: notificationKeys.list(user?.id ?? ""),
    queryFn: async () => {
      if (!user?.id) return [];
      const { success, data } = await getNotifications(user.id);
      return success && data ? data.filter((n) => !n.is_read).map(toAppNotification) : [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!socket || !user) return;

    const handleIncoming = (payload: AppNotification) => {
      queryClient.setQueryData(notificationKeys.list(user.id), (old: AppNotification[] = []) => {
        if (old.some((n) => n.notificationId === payload.notificationId)) return old;
        return [payload, ...old];
      });
    };

    socket.on("mention_notification", handleIncoming);
    socket.on("task_comment_mention_notification", handleIncoming);
    socket.on("task_assigned_notification", handleIncoming);

    return () => {
      socket.off("mention_notification", handleIncoming);
      socket.off("task_comment_mention_notification", handleIncoming);
      socket.off("task_assigned_notification", handleIncoming);
    };
  }, [socket, user, queryClient]);

  const dismiss = useCallback(
    (notificationId: string) => {
      if (!user) return;
      queryClient.setQueryData(notificationKeys.list(user.id), (old: AppNotification[] = []) =>
        old.filter((n) => n.notificationId !== notificationId),
      );
      markNotificationRead(user.id, notificationId);
    },
    [user, queryClient],
  );

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    queryClient.setQueryData(notificationKeys.list(user.id), []);
    markAllNotificationsRead(user.id);
  }, [user, queryClient]);

  return { notifications, isLoading, dismiss, markAllAsRead };
}

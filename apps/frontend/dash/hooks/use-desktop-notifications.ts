import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppNotification, NotificationTypeEnum } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { stripTokens } from "@/components/notifications";
import { playNotificationSound } from "@/lib/notification-sound";

const NOTIFICATION_ICON = "/web-app-manifest-192x192.png";

function buildAlert(notification: AppNotification): { title: string; body: string; targetPath: string } {
  switch (notification.type) {
    case NotificationTypeEnum.CHAT_MENTION: {
      const { message, room, workspace } = notification;
      const senderName = message.sender ? `${message.sender.firstname} ${message.sender.lastname}` : "Someone";
      return {
        title: `Mentioned in #${room.name ?? "a chat room"}`,
        body: `${senderName}: ${stripTokens(message.content)}`,
        targetPath: `/${workspace.slug}/chat/${room.id}`,
      };
    }
    case NotificationTypeEnum.TASK_COMMENT_MENTION: {
      const { comment, task, board, workspace } = notification;
      const authorName = comment.author ? `${comment.author.firstname} ${comment.author.lastname}` : "Someone";
      return {
        title: `Mentioned in ${task.shortId}: ${task.title}`,
        body: `${authorName}: ${stripTokens(comment.content)}`,
        targetPath: `/${workspace.slug}/board/${board.id}`,
      };
    }
    case NotificationTypeEnum.TASK_ASSIGNED: {
      const { task, board, workspace, assignedBy } = notification;
      const assignerName = assignedBy ? `${assignedBy.firstname} ${assignedBy.lastname}` : "Someone";
      return {
        title: "Assigned to you",
        body: `${assignerName} assigned you to ${task.shortId}: ${task.title}`,
        targetPath: `/${workspace.slug}/board/${board.id}`,
      };
    }
  }
}

export function useDesktopNotifications() {
  const { socket } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload: AppNotification) => {
      playNotificationSound();

      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return;

      const { title, body, targetPath } = buildAlert(payload);
      const desktopNotification = new Notification(title, { body, icon: NOTIFICATION_ICON, tag: payload.notificationId });

      desktopNotification.onclick = () => {
        window.focus();
        router.push(targetPath);
        desktopNotification.close();
      };
    };

    socket.on("mention_notification", handleIncoming);
    socket.on("task_comment_mention_notification", handleIncoming);
    socket.on("task_assigned_notification", handleIncoming);

    return () => {
      socket.off("mention_notification", handleIncoming);
      socket.off("task_comment_mention_notification", handleIncoming);
      socket.off("task_assigned_notification", handleIncoming);
    };
  }, [socket, router]);
}

"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChatMessage, MentionNotification, TaskComment, TaskCommentMentionNotification } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";

type RawMentionPayload = ChatMessage & {
  room: { id: string; name: string | null };
  workspace: { slug: string; name: string };
};

type RawTaskCommentMentionPayload = {
  comment: TaskComment;
  task: { id: string; shortId: string; title: string };
  board: { id: string; name: string };
  workspace: { slug: string; name: string };
};

export function useMentions() {
  const user = useUser();
  const { socket } = useSocket();
  const [mentions, setMentions] = useState<MentionNotification[]>([]);
  const [taskCommentMentions, setTaskCommentMentions] = useState<TaskCommentMentionNotification[]>([]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleMentionNotification = (payload: RawMentionPayload) => {
      const { room, workspace, ...message } = payload;
      const notification: MentionNotification = {
        notificationId: `mention_${message.id}_${Date.now()}`,
        message: message as ChatMessage,
        room,
        workspace,
        receivedAt: new Date().toISOString(),
      };

      setMentions((prev) => {
        // Deduplicate by message id (in case of re-delivery)
        if (prev.some((n) => n.message.id === message.id)) return prev;
        return [notification, ...prev];
      });
    };

    const handleTaskCommentMentionNotification = (payload: RawTaskCommentMentionPayload) => {
      const notification: TaskCommentMentionNotification = {
        notificationId: `task_comment_mention_${payload.comment.id}_${Date.now()}`,
        ...payload,
        receivedAt: new Date().toISOString(),
      };

      setTaskCommentMentions((prev) => {
        if (prev.some((n) => n.comment.id === payload.comment.id)) return prev;
        return [notification, ...prev];
      });
    };

    socket.on("mention_notification", handleMentionNotification);
    socket.on("task_comment_mention_notification", handleTaskCommentMentionNotification);

    return () => {
      socket.off("mention_notification", handleMentionNotification);
      socket.off("task_comment_mention_notification", handleTaskCommentMentionNotification);
    };
  }, [socket, user]);

  const dismissMention = useCallback((notificationId: string) => {
    setMentions((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  const dismissTaskCommentMention = useCallback((notificationId: string) => {
    setTaskCommentMentions((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setMentions([]);
    setTaskCommentMentions([]);
  }, []);

  return { mentions, dismissMention, taskCommentMentions, dismissTaskCommentMention, clearAll };
}

"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChatMessage, MentionNotification } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";

type RawMentionPayload = ChatMessage & {
  room: { id: string; name: string | null };
  workspace: { slug: string; name: string };
};

export function useMentions() {
  const user = useUser();
  const { socket } = useSocket();
  const [mentions, setMentions] = useState<MentionNotification[]>([]);

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

    socket.on("mention_notification", handleMentionNotification);

    return () => {
      socket.off("mention_notification", handleMentionNotification);
    };
  }, [socket, user]);

  const dismissMention = useCallback((notificationId: string) => {
    setMentions((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  const clearAll = useCallback(() => setMentions([]), []);

  return { mentions, dismissMention, clearAll };
}

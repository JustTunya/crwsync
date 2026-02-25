"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "@crwsync/types";
import { useChatStore } from "@/hooks/use-chat-store";
import { getChatMessages } from "@/services/chat.service";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface UseChatSocketOptions {
  workspaceId: string;
  roomId: string;
  currentUserId: string;
}

export function useChatSocket({ workspaceId, roomId, currentUserId }: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const {
    appendMessage,
    addOptimistic,
    confirmOptimistic,
    rejectOptimistic,
    setConnected,
  } = useChatStore();

  useEffect(() => {
    const socket = io(`${SOCKET_URL}/chat`, {
      withCredentials: true,
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_room", { roomId, workspaceId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("new_message", (message: ChatMessage) => {
      appendMessage(roomId, message);
    });

    socket.on("message_ack", (ack: { client_id: string; message_id: string; created_at: string }) => {
      const store = useChatStore.getState();
      const pending = store.pendingMessages.get(ack.client_id);
      if (pending) {
        confirmOptimistic(ack.client_id, {
          ...pending,
          id: ack.message_id,
          created_at: ack.created_at,
        });
      }
    });

    socket.on("message_error", (err: { client_id: string }) => {
      rejectOptimistic(err.client_id, roomId);
    });

    socket.io.on("reconnect", async () => {
      socket.emit("join_room", { roomId, workspaceId });

      const store = useChatStore.getState();
      const existing = store.messages.get(roomId) || [];
      const lastMessage = existing[existing.length - 1];

      if (lastMessage) {
        const result = await getChatMessages(
          workspaceId,
          roomId,
          undefined,
          50,
        );
        if (result.success && result.data) {
          const currentIds = new Set(existing.map((m) => m.id));
          const missed = result.data.messages.filter((m) => !currentIds.has(m.id));
          missed.forEach((m) => appendMessage(roomId, m));
        }
      }
    });

    return () => {
      socket.emit("leave_room", { roomId });
      socket.disconnect();
      setConnected(false);
      socketRef.current = null;
    };
  }, [workspaceId, roomId, appendMessage, confirmOptimistic, rejectOptimistic, setConnected]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !content.trim()) return;

      const clientId = crypto.randomUUID();
      const now = new Date().toISOString();

      const optimisticMessage: ChatMessage = {
        id: `pending_${clientId}`,
        workspace_id: workspaceId,
        room_id: roomId,
        sender_id: currentUserId,
        content: content.trim(),
        created_at: now,
        updated_at: now,
        is_deleted: false,
        is_edited: false,
        is_pinned: false,
        reply_to: null,
      };

      addOptimistic(roomId, optimisticMessage, clientId);

      socketRef.current.emit("send_message", {
        content: content.trim(),
        client_id: clientId,
      });

      setTimeout(() => {
        const store = useChatStore.getState();
        if (store.pendingMessages.has(clientId)) {
          rejectOptimistic(clientId, roomId);
        }
      }, 10000);
    },
    [workspaceId, roomId, currentUserId, addOptimistic, rejectOptimistic],
  );

  return { sendMessage };
}

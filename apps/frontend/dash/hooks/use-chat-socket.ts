"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage, ChatReadReceipt } from "@crwsync/types";
import { useChatStore } from "@/hooks/use-chat-store";
import { getChatMessages } from "@/services/chat.service";
import { useSession } from "@/hooks/use-session";
import { useUser } from "@/providers/user.provider";
import type { TypingUser } from "@/components/chat/TypingIndicator";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Bug 4 & 5 fix: Module-level singleton socket.
// Prevents redundant TCP connections when switching rooms, and allows
// leave_room to flush before the next join_room without severing the link.
const chatSocket: Socket = io(`${SOCKET_URL}/chat`, {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: false,
});

interface UseChatSocketOptions {
  workspaceId: string;
  roomId: string;
  currentUserId: string;
}

export function useChatSocket({ workspaceId, roomId, currentUserId }: UseChatSocketOptions) {
  const socketRef = useRef<Socket>(chatSocket);
  
  const { isFetching } = useSession();
  const wasFetching = useRef(isFetching);

  const appendMessage = useChatStore((s) => s.appendMessage);
  const appendMissedMessages = useChatStore((s) => s.appendMissedMessages);
  const addOptimistic = useChatStore((s) => s.addOptimistic);
  const confirmOptimistic = useChatStore((s) => s.confirmOptimistic);
  const rejectOptimistic = useChatStore((s) => s.rejectOptimistic);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setConnected = useChatStore((s) => s.setConnected);
  const addTypingUser = useChatStore((s) => s.addTypingUser);
  const removeTypingUser = useChatStore((s) => s.removeTypingUser);
  const updateReadReceipt = useChatStore((s) => s.updateReadReceipt);

  const user = useUser();

  useEffect(() => {
    if (wasFetching.current && !isFetching) {
      if (chatSocket.disconnected) {
        chatSocket.connect();
      }
    }
    wasFetching.current = isFetching;
  }, [isFetching]);

  useEffect(() => {
    const socket = chatSocket;

    // Connect the singleton if it isn't already
    if (socket.disconnected) {
      socket.connect();
    }

    const handleConnect = () => {
      setConnected(true);
      socket.emit("join_room", { roomId, workspaceId });
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleNewMessage = (message: ChatMessage) => {
      appendMessage(roomId, message);
    };

    const handleMessageUpdated = (message: ChatMessage) => {
      updateMessage(roomId, message.id, message);
    };

    const handleMessageAck = (ack: { client_id: string; message: ChatMessage }) => {
      confirmOptimistic(ack.client_id, ack.message);
    };

    const handleMessageError = (err: { client_id: string }) => {
      rejectOptimistic(err.client_id, roomId);
    };

    const handleMessageRead = (receipt: ChatReadReceipt) => {
      updateReadReceipt(roomId, receipt);
    };

    const handleTypingStart = ({ user, roomId: room }: { user: TypingUser; roomId: string }) => {
      if (room === roomId && user.id !== currentUserId) {
        addTypingUser(roomId, user);
      }
    };

    const handleTypingStop = ({ userId, roomId: room }: { userId: string; roomId: string }) => {
      if (room === roomId && userId !== currentUserId) {
        removeTypingUser(roomId, userId);
      }
    };

    const handleReconnect = async () => {
      const store = useChatStore.getState();
      const existing = store.messages.get(roomId) || [];
      const lastMessage = existing[existing.length - 1];

      if (lastMessage) {
        // Paginate forward from the last known message to close any gap
        let cursor: string | undefined = lastMessage.created_at;
        let hasMore = true;

        while (hasMore && cursor) {
          const result = await getChatMessages(
            workspaceId,
            roomId,
            cursor,
            100,
            "after",
          );

          if (result.success && result.data) {
            if (result.data.messages.length > 0) {
              appendMissedMessages(roomId, result.data.messages);
            }
            hasMore = result.data.has_more;
            cursor = result.data.next_cursor ?? undefined;
          } else {
            hasMore = false;
          }
        }
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("new_message", handleNewMessage);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_ack", handleMessageAck);
    socket.on("message_error", handleMessageError);
    socket.on("message_read", handleMessageRead);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.io.on("reconnect", handleReconnect);

    // If already connected (singleton was alive from a previous room),
    // manually fire the join since "connect" won't re-fire.
    if (socket.connected) {
      socket.emit("join_room", { roomId, workspaceId });
      setConnected(true);
    }

    return () => {
      // Bug 5 fix: Emit leave_room but do NOT disconnect the singleton socket.
      // Removing listeners prevents stale closures for the previous room.
      socket.emit("leave_room", { roomId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("new_message", handleNewMessage);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_ack", handleMessageAck);
      socket.off("message_error", handleMessageError);
      socket.off("message_read", handleMessageRead);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.io.off("reconnect", handleReconnect);
    };
  }, [workspaceId, roomId, currentUserId, appendMessage, appendMissedMessages, updateMessage, confirmOptimistic, rejectOptimistic, setConnected, addTypingUser, removeTypingUser, updateReadReceipt]);

  const sendMessage = useCallback(
    (content: string, mentionedUserIds: string[] = [], isEveryoneMention: boolean = false) => {
      if (!socketRef.current || !content.trim()) return;

      const clientId = crypto.randomUUID();
      const now = new Date().toISOString();

      const optimisticMessage: ChatMessage = {
        id: `pending_${clientId}`,
        client_id: clientId,
        workspace_id: workspaceId,
        room_id: roomId,
        sender_id: currentUserId,
        content: content.trim(),
        created_at: now,
        updated_at: now,
        is_deleted: false,
        is_edited: false,
        is_pinned: false,
        reply_to_id: null,
        reply_to: null,
        sender: user ? {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          avatar_key: user.avatar_key ?? null,
        } : undefined,
        reactions: [],
      };

      const store = useChatStore.getState();
      if (store.replyingToMessage) {
        optimisticMessage.reply_to_id = store.replyingToMessage.id;
        optimisticMessage.reply_to = {
          id: store.replyingToMessage.id,
          content: store.replyingToMessage.content,
          sender: {
            firstname: store.replyingToMessage.sender?.firstname || "",
            lastname: store.replyingToMessage.sender?.lastname || "",
          },
        };
      }

      addOptimistic(roomId, optimisticMessage, clientId);

      socketRef.current.emit("send_message", {
        content: content.trim(),
        client_id: clientId,
        reply_to_id: store.replyingToMessage?.id || undefined,
        mentionedUserIds,
        isEveryoneMention,
      });

      store.setReplyingTo(null);

      setTimeout(() => {
        const store = useChatStore.getState();
        if (store.pendingMessages.has(clientId)) {
          rejectOptimistic(clientId, roomId);
        }
      }, 10000);
    },
    [workspaceId, roomId, currentUserId, user, addOptimistic, rejectOptimistic],
  );

  const editMessage = useCallback(
    (messageId: string, newContent: string) => {
      if (!socketRef.current) return;

      updateMessage(roomId, messageId, {
        content: newContent,
        is_edited: true,
      });

      socketRef.current.emit("edit_message", {
        message_id: messageId,
        new_content: newContent,
      });
    },
    [roomId, updateMessage],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socketRef.current) return;

      updateMessage(roomId, messageId, {
        is_deleted: true,
        content: "This message was deleted.",
      });

      socketRef.current.emit("delete_message", {
        message_id: messageId,
      });
    },
    [roomId, updateMessage],
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socketRef.current || !currentUserId) return;

      const store = useChatStore.getState();
      const existing = store.messages.get(roomId) || [];
      const message = existing.find((m) => m.id === messageId);
      
      if (!message) return;

      const currentReactions = message.reactions || [];

      const optimisticReactions = [...currentReactions];
      const existingReactionIndex = optimisticReactions.findIndex(r => r.user_id === currentUserId);

      if (existingReactionIndex !== -1) {
        if (optimisticReactions[existingReactionIndex].emoji === emoji) {
          optimisticReactions.splice(existingReactionIndex, 1);
        } else {
          optimisticReactions[existingReactionIndex] = {
            ...optimisticReactions[existingReactionIndex],
            emoji,
            created_at: new Date().toISOString()
          };
        }
      } else {
        const newReaction = {
          id: `pending_${crypto.randomUUID()}`,
          message_id: messageId,
          user_id: currentUserId,
          emoji,
          created_at: new Date().toISOString(),
          user: {
            id: currentUserId,
            firstname: user?.firstname || "",
            lastname: user?.lastname || "",
            avatar_key: null,
          }
        };
        optimisticReactions.push(newReaction);
      }

      updateMessage(roomId, messageId, {
        reactions: optimisticReactions,
      });

      socketRef.current.emit("toggle_reaction", {
        message_id: messageId,
        emoji,
      });
    },
    [roomId, updateMessage, currentUserId, user],
  );

  const sendTypingStart = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing_start", { roomId });
  }, [roomId]);

  const sendTypingStop = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing_stop", { roomId });
  }, [roomId]);

  const markAsRead = useCallback(
    (messageId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("mark_as_read", { message_id: messageId });
    },
    [],
  );

  return { sendMessage, editMessage, deleteMessage, toggleReaction, sendTypingStart, sendTypingStop, markAsRead };
}

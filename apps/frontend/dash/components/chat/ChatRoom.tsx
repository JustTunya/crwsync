"use client";

import { useEffect } from "react";
import type { ChatMessage } from "@crwsync/types";
import { useChatStore } from "@/hooks/use-chat-store";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatRoom, useChatMessages } from "@/hooks/use-chat";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

const EMPTY_MESSAGES: ChatMessage[] = [];

interface ChatRoomProps {
  workspaceId: string;
  roomId: string;
  currentUserId: string;
}

export function ChatRoom({ workspaceId, roomId, currentUserId }: ChatRoomProps) {
  const { data: room } = useChatRoom(workspaceId, roomId);
  const { data: initialMessages } = useChatMessages(workspaceId, roomId);

  const { setMessages, clearRoom } = useChatStore();
  const messages = useChatStore((s) => s.messages.get(roomId)) ?? EMPTY_MESSAGES;
  const isConnected = useChatStore((s) => s.isConnected);

  const { sendMessage } = useChatSocket({ workspaceId, roomId, currentUserId });

  useEffect(() => {
    if (initialMessages?.messages && messages.length === 0) {
      setMessages(roomId, initialMessages.messages);
    }
  }, [initialMessages, roomId, setMessages, messages.length]);

  useEffect(() => {
    return () => {
      clearRoom(roomId);
    };
  }, [roomId, clearRoom]);

  return (
    <div className="size-full flex flex-col">
      <div className="flex items-center justify-between h-16 pl-16 pr-24 border-b border-base-200">
        <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">{room?.name || "Chat"}</h1>
      </div>

      {!isConnected && (
        <div className="w-full p-1 bg-muted">
          <p className="text-xs text-center text-muted-foreground">Connecting...</p>
        </div>
      )}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
      />

      <ChatInput onSend={sendMessage} disabled={!isConnected} />
    </div>
  );
}

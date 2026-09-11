"use client";

import { useEffect } from "react";
import type { ChatMessage } from "@crwsync/types";
import { useChatStore } from "@/hooks/use-chat-store";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatRoom, useChatMessages } from "@/hooks/use-chat";
import { useDirectMessages } from "@/hooks/use-dm";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { UserAvatar } from "@/components/user-avatar";

const EMPTY_MESSAGES: ChatMessage[] = [];

interface ChatRoomProps {
  workspaceId: string;
  roomId: string;
  currentUserId: string;
}

export function ChatRoom({ workspaceId, roomId, currentUserId }: ChatRoomProps) {
  const { data: room } = useChatRoom(workspaceId, roomId);
  const { data: initialMessages } = useChatMessages(workspaceId, roomId);
  const { data: dmSummaries } = useDirectMessages(room?.is_direct ? workspaceId : undefined);
  const dmParticipant = room?.is_direct
    ? dmSummaries?.find((dm) => dm.room.id === roomId)?.otherParticipant
    : undefined;

  const { setMessages, clearRoom } = useChatStore();
  const messages = useChatStore((s) => s.messages.get(roomId)) ?? EMPTY_MESSAGES;
  const typingUsers = useChatStore((s) => s.typingUsers.get(roomId)) ?? [];
  const isConnected = useChatStore((s) => s.isConnected);

  const readReceipts = useChatStore((s) => s.readReceipts.get(roomId)) ?? {};

  const { sendMessage, editMessage, deleteMessage, sendTypingStart, sendTypingStop, toggleReaction, markAsRead } = useChatSocket({ workspaceId, roomId, currentUserId });

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
        {room?.is_direct ? (
          <div className="flex items-center gap-3">
            <UserAvatar user={dmParticipant} size={8} />
            <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">
              {dmParticipant ? `${dmParticipant.firstname} ${dmParticipant.lastname}` : "Direct Message"}
            </h1>
          </div>
        ) : (
          <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">{room?.name || "Chat"}</h1>
        )}
      </div>

      {!isConnected && (
        <div className="w-full p-1 bg-muted">
          <p className="text-xs text-center text-muted-foreground">Connecting...</p>
        </div>
      )}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onToggleReaction={toggleReaction}
        typingUsers={typingUsers}
        markAsRead={markAsRead}
        readReceipts={readReceipts}
      />

      <ChatInput
        workspaceId={workspaceId}
        roomId={roomId}
        onSend={sendMessage}
        disabled={!isConnected}
        isDirect={room?.is_direct}
        onTypingStart={sendTypingStart}
        onTypingStop={sendTypingStop}
      />
    </div>
  );
}

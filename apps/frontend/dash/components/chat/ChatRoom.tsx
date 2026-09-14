"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ChatMessage } from "@crwsync/types";
import { useTranslation } from "@crwsync/i18n";
import { useAnnounce } from "@/components/a11y/live-announcer";
import { useChatStore } from "@/hooks/use-chat-store";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatRoom, useChatMessages } from "@/hooks/use-chat";
import { useDirectMessages } from "@/hooks/use-dm";
import { highlightTarget } from "@/hooks/use-highlight-target";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { UserAvatar } from "@/components/user-avatar";
import { LSidebarToggle } from "@/components/l-sidebar";
import { RSidebarToggle } from "@/components/r-sidebar";
import type { TypingUser } from "@/components/chat/TypingIndicator";

const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_TYPING_USERS: TypingUser[] = [];

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

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { announce } = useAnnounce();
  const { t } = useTranslation();

  const { setMessages, clearRoom } = useChatStore();
  const messages = useChatStore((s) => s.messages.get(roomId)) ?? EMPTY_MESSAGES;
  const typingUsers = useChatStore((s) => s.typingUsers.get(roomId)) ?? EMPTY_TYPING_USERS;
  const isConnected = useChatStore((s) => s.isConnected);

  const readReceipts = useChatStore((s) => s.readReceipts.get(roomId)) ?? {};

  const { sendMessage, editMessage, deleteMessage, sendTypingStart, sendTypingStop, toggleReaction, markAsRead } = useChatSocket({ workspaceId, roomId, currentUserId });

  const prevLastMessageIdRef = useRef<string | null>(null);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (!lastMessage) return;
    if (prevLastMessageIdRef.current && prevLastMessageIdRef.current !== lastMessage.id) {
      if (lastMessage.sender_id !== currentUserId && lastMessage.sender) {
        const senderName = `${lastMessage.sender.firstname} ${lastMessage.sender.lastname}`.trim() || "Someone";
        announce(t("a11y.newMessage", { user: senderName }));
      }
    }
    prevLastMessageIdRef.current = lastMessage.id;
  }, [lastMessage, currentUserId, announce, t]);

  const prevTypingCountRef = useRef(0);
  useEffect(() => {
    if (typingUsers.length > prevTypingCountRef.current && typingUsers.length > 0) {
      if (typingUsers.length === 1) {
        const name = `${typingUsers[0].firstname} ${typingUsers[0].lastname}`.trim();
        announce(t("chat.typingSingle", { user: name }));
      } else {
        announce(t("chat.typingMultiple", { users: `${typingUsers.length} users` }));
      }
    }
    prevTypingCountRef.current = typingUsers.length;
  }, [typingUsers, announce, t]);

  useEffect(() => {
    if (initialMessages?.messages && messages.length === 0) {
      setMessages(roomId, initialMessages.messages);
    }
  }, [initialMessages, roomId, setMessages, messages.length]);

  useEffect(() => {
    const messageId = searchParams.get("messageId");
    if (!messageId) return;

    const clearParam = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("messageId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const existing = document.getElementById(`message-${messageId}`);
    if (existing) {
      highlightTarget(`message-${messageId}`, ".message-highlight-target");
    }
    clearParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, messages]);

  useEffect(() => {
    return () => {
      clearRoom(roomId);
    };
  }, [roomId, clearRoom]);

  return (
    <div className="size-full flex flex-col">
      <div className="flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200">
        <div className="flex items-center gap-3 min-w-0">
          <LSidebarToggle />
          {room?.is_direct ? (
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar user={dmParticipant} size={8} />
              <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">
                {dmParticipant ? `${dmParticipant.firstname} ${dmParticipant.lastname}` : "Direct Message"}
              </h1>
            </div>
          ) : (
            <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">{room?.name || "Chat"}</h1>
          )}
        </div>
        <RSidebarToggle />
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

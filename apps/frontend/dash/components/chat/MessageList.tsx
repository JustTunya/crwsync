"use client";

import { useEffect, useRef, Fragment } from "react";
import type { ChatMessage, ChatReadReceipt } from "@crwsync/types";
import { format } from "date-fns";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator, type TypingUser } from "@/components/chat/TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onEditMessage: (id: string, newContent: string) => void;
  onDeleteMessage: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  typingUsers?: TypingUser[];
  markAsRead?: (id: string) => void;
  readReceipts?: Record<string, ChatReadReceipt>;
}

export function MessageList({ messages, currentUserId, onLoadMore, hasMore, isLoadingMore, onEditMessage, onDeleteMessage, onToggleReaction, typingUsers, markAsRead, readReceipts }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const prevLengthRef = useRef(0);

  const checkAtBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    if (!markAsRead || messages.length === 0) return;

    let latestOtherMessage: ChatMessage | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id !== currentUserId && !messages[i].id.startsWith("pending_")) {
        latestOtherMessage = messages[i];
        break;
      }
    }

    if (!latestOtherMessage) return;

    const myReceipt = readReceipts?.[currentUserId];
    if (myReceipt) {
      const myReadDate = new Date(myReceipt.last_read_at).getTime();
      const msgDate = new Date(latestOtherMessage.created_at).getTime();
      if (myReadDate >= msgDate) {
        return;
      }
    }

    const el = document.getElementById(`msg-${latestOtherMessage.id}`);
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          markAsRead(latestOtherMessage!.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [messages, currentUserId, markAsRead, readReceipts]);

  useEffect(() => {
    if (messages.length > prevLengthRef.current && wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (typingUsers && typingUsers.length > 0 && wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingUsers]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  const handleScroll = () => {
    wasAtBottomRef.current = checkAtBottom();

    const el = containerRef.current;
    if (el && el.scrollTop < 100 && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  const isNewDay = (index: number): boolean => {
    if (index === 0) return true;
    const prevDate = new Date(messages[index - 1].created_at);
    const currDate = new Date(messages[index].created_at);
    return (
      currDate.getDate() !== prevDate.getDate() ||
      currDate.getMonth() !== prevDate.getMonth() ||
      currDate.getFullYear() !== prevDate.getFullYear()
    );
  };

  const isConsecutive = (index: number): boolean => {
    if (index === 0) return false;
    if (isNewDay(index)) return false;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.sender_id !== curr.sender_id) return false;
    const gap = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return gap < 120000;
  };

  const isLastInGroup = (index: number): boolean => {
    if (index === messages.length - 1) return true;
    const curr = messages[index];
    const next = messages[index + 1];

    if (curr.sender_id !== next.sender_id) return true;

    const gap = new Date(next.created_at).getTime() - new Date(curr.created_at).getTime();
    return gap >= 120000;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 flex flex-col"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">No messages yet. Start the conversation!</p>
        </div>
      )}

      {messages.map((message, index) => {
        const showDate = isNewDay(index);

        return (
          <Fragment key={message.id}>
            {showDate && (
              <div className="flex items-center justify-center gap-6 mt-6 mb-3 first:mt-3">
                <div className="w-full h-px bg-base-200 rounded-full" />
                <span className="text-base-300 text-xs font-semibold">
                  {format(new Date(message.created_at), "yyyy.MM.dd")}
                </span>
                <div className="w-full h-px bg-base-200 rounded-full" />
              </div>
            )}
            <div id={`msg-${message.id}`} className="flex flex-col">
              <MessageBubble
                message={message}
                isSelf={message.sender_id === currentUserId}
                isConsecutive={isConsecutive(index)}
                isLastInGroup={isLastInGroup(index)}
                isPending={message.id.startsWith("pending_")}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onToggleReaction={onToggleReaction}
                readReceipts={Object.values(readReceipts || {}).filter(
                  (r) => r.message_id === message.id && r.user_id !== currentUserId
                )}
              />
            </div>
          </Fragment>
        );
      })}

      {typingUsers && typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

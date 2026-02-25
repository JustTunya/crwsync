"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@crwsync/types";
import { MessageBubble } from "@/components/chat/MessageBubble";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function MessageList({ messages, currentUserId, onLoadMore, hasMore, isLoadingMore }: MessageListProps) {
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
    if (messages.length > prevLengthRef.current && wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

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

  const isConsecutive = (index: number): boolean => {
    if (index === 0) return false;
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
      className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
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

      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isSelf={message.sender_id === currentUserId}
          isConsecutive={isConsecutive(index)}
          isLastInGroup={isLastInGroup(index)}
          isPending={message.id.startsWith("pending_")}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

"use client";

import { useRef } from "react";
import type { ChatMessage } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
  isConsecutive: boolean;
  isLastInGroup: boolean;
  isPending: boolean;
}

export function MessageBubble({ message, isSelf, isConsecutive, isLastInGroup, isPending }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={cn(
        "flex gap-2",
        isSelf ? "justify-end" : "justify-start",
        isConsecutive ? "mt-0.5" : "mt-3",
      )}
    >
      {!isSelf && (
        <div className="w-6 py-4 mr-1 shrink-0 flex items-end">
          {isLastInGroup && message.sender ? (
            <UserAvatar
              user={{
                firstname: message.sender.firstname,
                lastname: message.sender.lastname,
                avatar_key: message.sender.avatar_key,
              }}
              size={6}
            />
          ) : null}
        </div>
      )}

      <div className={cn("flex flex-col w-[70%] max-w-lg", isSelf ? "items-end" : "items-start")}>
        {!isConsecutive && !isSelf && message.sender && (
          <span className="text-xs text-muted-foreground font-medium mb-0.5 ml-1">
            {message.sender.firstname} {message.sender.lastname}
          </span>
        )}

        <div
          className={cn(
            "px-2.5 py-1.5 text-sm leading-relaxed whitespace-pre-wrap",
            isSelf
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-xs"
              : "bg-muted text-muted-foreground rounded-2xl rounded-bl-xs",
            isPending && "opacity-60 animate-pulse",
          )}
        >
          {message.content}
        </div>

        {(isLastInGroup || isPending) && (
          <span className="text-[10px] text-muted-foreground/50 mt-0.5 transition-opacity">
            {isPending ? "Sending..." : time}
          </span>
        )}
      </div>
    </div>
  );
}

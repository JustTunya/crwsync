"use client";

import { useState, useRef } from "react";
import type { ChatMessage } from "@crwsync/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit03Icon, Delete02Icon, UnavailableIcon } from "@hugeicons/core-free-icons";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
  isConsecutive: boolean;
  isLastInGroup: boolean;
  isPending: boolean;
  onEditMessage?: (id: string, newContent: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export function MessageBubble({ message, isSelf, isConsecutive, isLastInGroup, isPending, onEditMessage, onDeleteMessage }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const ref = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEditMessage?.(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setEditContent(message.content);
      setIsEditing(false);
    }
  };

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

        <div className={cn("relative group/bubble flex items-center gap-2", isSelf ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "px-2.5 py-1.5 text-sm leading-relaxed whitespace-pre-wrap",
              isSelf
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-xs"
                : "bg-muted text-muted-foreground rounded-2xl rounded-bl-xs",
              isPending && "opacity-60 animate-pulse",
              message.is_deleted && "bg-base-100 border-[1.5px] border-base-300 text-muted-foreground italic rounded-2xl"
            )}
          >
            {isEditing ? (
              <div className="flex flex-col">
                <div className="grid relative text-current">
                  <div className="col-start-1 row-start-1 invisible">
                    {message.content}
                  </div>
                  <textarea
                    className="absolute col-start-1 row-start-1 w-full h-full min-h-0 outline-none resize-none text-current"
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2 mb-0.5 text-xs">
                  <button 
                    onClick={() => { 
                      setEditContent(message.content); 
                      setIsEditing(false); 
                    }} 
                    className="opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEditSubmit} 
                    className="font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>{message.is_deleted ? (
                <div className="flex items-center gap-1">
                  <HugeiconsIcon icon={UnavailableIcon} strokeWidth={1.75} className="size-3.5" />
                  <p className="text-muted-foreground italic">This message was deleted.</p>
                </div>
              ) : message.content}</>
            )}
          </div>

          {isSelf && !message.is_deleted && !isPending && !isEditing && (
            <div className="opacity-0 group-hover/bubble:opacity-100 flex items-center gap-1 transition-opacity">
              <button onClick={() => setIsEditing(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-base-200">
                <HugeiconsIcon icon={Edit03Icon} strokeWidth={2} className="size-4" />
              </button>
              <button onClick={() => onDeleteMessage?.(message.id)} className="p-1 text-muted-foreground hover:text-error transition-colors rounded-md hover:bg-error/10">
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
              </button>
            </div>
          )}
        </div>

        {(isLastInGroup || isPending) && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground/50 transition-opacity">
              {isPending ? "Sending..." : time}
            </span>
            {message.is_edited && !message.is_deleted && !isPending && (
              <span className="text-[10px] text-muted-foreground/50 font-medium">(edited)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

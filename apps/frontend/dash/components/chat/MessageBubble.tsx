"use client";

import { useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit03Icon, Delete02Icon, UnavailableIcon, ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons";
import type { ChatMessage } from "@crwsync/types";
import { useChatStore } from "@/hooks/use-chat-store";
import { UserAvatar } from "@/components/user-avatar";
import { LinkPreview } from "./LinkPreview";
import { cn } from "@/lib/utils";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderMessageContent(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (part.match(URL_REGEX)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

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
  const { setReplyingTo } = useChatStore();

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

  const match = message.content.match(URL_REGEX);
  const firstUrl = match ? match[0] : null;

  return (
    <div
      id={`message-${message.id}`}
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

        {message.reply_to && !message.is_deleted && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const target = document.getElementById(`message-${message.reply_to_id}`);
              if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                const bubble = target.querySelector(".message-highlight-target");
                if (bubble) {
                  bubble.classList.add("bg-primary/20");
                  setTimeout(() => bubble.classList.remove("bg-primary/20"), 1500);
                }
              }
            }}
            className="group/reply relative z-0 flex flex-col max-w-xs mb-1 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded-2xl bg-muted/60 hover:bg-muted border border-base-200 hover:border-base-300 transition-all cursor-pointer"
          >
            <span className="font-semibold text-primary/80 mb-0.5 opacity-90 group-hover/reply:opacity-100 transition-opacity">
              {message.reply_to.sender?.firstname || "Unknown User"}
              {message.reply_to.sender?.lastname ? ` ${message.reply_to.sender.lastname.charAt(0)}.` : ""}
            </span>
            <span className="text-muted-foreground/90 text-ellipsis line-clamp-2 overflow-hidden opacity-90 group-hover/reply:opacity-100 transition-opacity">
              {message.reply_to.content}
            </span>
          </div>
        )}

        <div className={cn("relative z-10 group/bubble flex items-center gap-2", isSelf ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "message-highlight-target px-2.5 py-1.5 text-sm leading-relaxed whitespace-pre-wrap transition-colors duration-500",
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
              <>
                {message.is_deleted ? (
                  <div className="flex items-center gap-1">
                    <HugeiconsIcon icon={UnavailableIcon} strokeWidth={1.75} className="size-3.5" />
                    <p className="text-muted-foreground italic">This message was deleted.</p>
                  </div>
                ) : (
                  renderMessageContent(message.content)
                )}
              </>
            )}
          </div>

          {!message.is_deleted && !isPending && !isEditing && (
            <div className={cn(
              "opacity-0 group-hover/bubble:opacity-100 flex items-center gap-1 transition-opacity",
              !isSelf && "flex-row-reverse"
            )}>
              <button onClick={() => setReplyingTo(message)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-base-200 cursor-pointer">
                <HugeiconsIcon icon={ArrowTurnBackwardIcon} strokeWidth={2} className="size-4 -scale-y-100" />
              </button>
              {isSelf && (
                <>
                  <button onClick={() => setIsEditing(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-base-200 cursor-pointer">
                    <HugeiconsIcon icon={Edit03Icon} strokeWidth={2} className="size-4" />
                  </button>
                  <button onClick={() => onDeleteMessage?.(message.id)} className="p-1 text-muted-foreground hover:text-error transition-colors rounded-md hover:bg-error/10 cursor-pointer">
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {firstUrl && !message.is_deleted && !isEditing && (
          <LinkPreview workspaceId={message.workspace_id} url={firstUrl} />
        )}

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
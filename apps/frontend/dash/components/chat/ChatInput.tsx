"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Cancel01Icon, Happy01Icon } from "@hugeicons/core-free-icons";
import type { WorkspaceMember } from "@crwsync/types";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useChatStore } from "@/hooks/use-chat-store";
import { UserAvatar } from "@/components/user-avatar";
import EmojiPicker from "@/components/chat/EmojiPicker";
import { cn } from "@/lib/utils";

type MentionOption = 
  | { type: "user"; user: NonNullable<WorkspaceMember["user"]> }
  | { type: "everyone" };

interface ChatInputProps {
  workspaceId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function ChatInput({ workspaceId, onSend, disabled, onTypingStart, onTypingStop }: ChatInputProps) {
  const { replyingToMessage, setReplyingTo } = useChatStore();
  const [content, setContent] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerTyping = () => {
    if (onTypingStart) {
      onTypingStart();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 3000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerOpen &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setEmojiPickerOpen(false);
      }
    };
    if (emojiPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerOpen]);

  const { data: members } = useWorkspaceMembers(workspaceId);

  const activeMentions = useMemo(() => {
    const list: { display: string; replaceWith: string }[] = [];
    list.push({ display: "@everyone", replaceWith: "@everyone" });
    if (members) {
      members.forEach((m) => {
        if (m.user) {
          list.push({
            display: `@${m.user.firstname} ${m.user.lastname}`,
            replaceWith: `@[${m.user.firstname} ${m.user.lastname}](user:${m.user.id})`,
          });
        }
      });
    }
    return list.sort((a, b) => b.display.length - a.display.length);
  }, [members]);

  const renderColoredText = (text: string) => {
    if (!activeMentions.length) return <span className="text-foreground">{text}</span>;
    
    const escaped = activeMentions.map(m => m.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(^|\\n|\\s)(${escaped.join("|")})(?=$|\\s|\\n|[.,!?;:])`, "g");
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index + match[1].length;
      const matchEnd = matchStart + match[2].length;
      
      if (matchStart > lastIndex) {
        parts.push(<span key={lastIndex} className="text-foreground">{text.slice(lastIndex, matchStart)}</span>);
      }
      parts.push(<span key={matchStart} className="text-info">{match[2]}</span>);
      lastIndex = matchEnd;
      regex.lastIndex = matchEnd; 
    }
    
    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex} className="text-foreground">{text.slice(lastIndex)}</span>);
    }
    
    return parts;
  };

  const [mentionState, setMentionState] = useState({ active: false, text: "", startIndex: -1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredOptions = useMemo(() => {
    if (!mentionState.active) return [];
    
    const search = mentionState.text.toLowerCase();
    const opts: MentionOption[] = (members || [])
      .filter((m) => m.user)
      .filter((m) => {
        const u = m.user!;
        const f = u.firstname?.toLowerCase() || "";
        const l = u.lastname?.toLowerCase() || "";
        const un = u.username?.toLowerCase() || "";
        const fullName = `${f} ${l}`;
        return (
          f.includes(search) ||
          l.includes(search) ||
          un.includes(search) ||
          fullName.includes(search)
        );
      })
      .map((m) => ({ type: "user", user: m.user! }));

    if ("everyone".includes(search.trim())) {
      opts.push({ type: "everyone" });
    }

    const exactMatchExists = opts.some(opt => {
      const matchName = opt.type === "everyone" ? "everyone" : `${opt.user.firstname} ${opt.user.lastname}`.toLowerCase();
      return matchName === search.trim();
    });

    if (exactMatchExists) {
      return [];
    }

    return opts;
  }, [mentionState.active, mentionState.text, members]);

  const clampedSelectedIndex = Math.max(0, Math.min(selectedIndex, filteredOptions.length - 1));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  const handleSubmit = () => {
    if (!content.trim() || disabled) return;

    let processedContent = content;
    if (activeMentions.length > 0) {
      const escaped = activeMentions.map(m => m.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`(^|\\n|\\s)(${escaped.join("|")})(?=$|\\s|\\n|[.,!?;:])`, "g");
      processedContent = processedContent.replace(regex, (match, p1, p2) => {
        const mention = activeMentions.find(m => m.display === p2);
        return p1 + (mention ? mention.replaceWith : p2);
      });
    }

    onSend(processedContent);
    setContent("");
    setMentionState({ active: false, text: "", startIndex: -1 });
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onTypingStop) onTypingStop();
  };

  const insertMention = (option: MentionOption) => {
    let mentionText = "";
    if (option.type === "everyone") {
      mentionText = "@everyone";
    } else {
      mentionText = `@${option.user.firstname} ${option.user.lastname}`;
    }

    const beforeMention = content.slice(0, mentionState.startIndex);
    const afterCursor = content.slice(textareaRef.current?.selectionStart || content.length);
    
    const newContent = beforeMention + mentionText + " " + afterCursor;
    setContent(newContent);
    setMentionState({ active: false, text: "", startIndex: -1 });
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    const cursorPosition = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    
    const newContent = textBeforeCursor + emoji.native + textAfterCursor;
    setContent(newContent);
    setEmojiPickerOpen(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = cursorPosition + emoji.native.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    if (value.trim()) {
      triggerTyping();
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (onTypingStop) onTypingStop();
    }

    if (!members) return;

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      if (lastAtSymbolIndex === 0 || /[\s\n]/.test(textBeforeCursor[lastAtSymbolIndex - 1])) {
        const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
        if (!textAfterAt.startsWith(" ") && !/\n/.test(textAfterAt) && textAfterAt.length < 50) {
          setMentionState({ active: true, text: textAfterAt, startIndex: lastAtSymbolIndex });
          return;
        }
      }
    }
    
    setMentionState({ active: false, text: "", startIndex: -1 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (emojiPickerOpen && e.key === "Escape") {
      e.preventDefault();
      setEmojiPickerOpen(false);
      return;
    }

    if (mentionState.active && filteredOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((clampedSelectedIndex + 1) % filteredOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((clampedSelectedIndex - 1 + filteredOptions.length) % filteredOptions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        insertMention(filteredOptions[clampedSelectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionState({ active: false, text: "", startIndex: -1 });
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <div className="relative flex flex-col items-center justify-center w-full px-4 pt-4 pb-6">
        
        {mentionState.active && filteredOptions.length > 0 && (
          <div className="mb-3 w-full max-w-2xl max-h-36 overflow-y-auto bg-base-100 backdrop-blur-md border border-base-300 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 scrollbar-thin">
            {filteredOptions.map((option, idx) => (
              <button
                key={option.type === "everyone" ? "everyone" : option.user.id}
                type="button"
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  idx === clampedSelectedIndex ? "bg-primary/10 text-primary" : "hover:bg-base-200 text-foreground"
                )}
                onClick={() => insertMention(option)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                {option.type === "everyone" ? (
                  <div className="flex items-center justify-center size-7 rounded-full bg-primary/20 text-primary shrink-0">
                    <span className="text-sm font-bold">@</span>
                  </div>
                ) : (
                  <UserAvatar 
                    user={{ 
                      firstname: option.user.firstname, 
                      lastname: option.user.lastname, 
                      avatar_key: option.user.avatar_key 
                    }} 
                    variant="ghost"
                  />
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">
                    {option.type === "everyone" ? "Everyone" : `${option.user.firstname} ${option.user.lastname}`}
                  </span>
                  {option.type === "user" && (
                    <span className="text-xs text-muted-foreground leading-none truncate">
                      {option.user.username}
                    </span>
                  )}
                  {option.type === "everyone" && (
                    <span className="text-xs text-muted-foreground leading-none truncate">
                      Mention everyone in the chat
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col w-full max-w-2xl bg-muted border-[1.5px] border-base-300 rounded-2xl focus-within:border-primary/50 transition-colors">
          {replyingToMessage && (
            <div className="flex items-center justify-between px-3 py-2 bg-base-100/50 border-b-[1.5px] border-b-base-300 rounded-t-[calc(1rem-1.5px)]">
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-xs text-primary font-medium tracking-wide">
                  Replying to {replyingToMessage.sender?.firstname || "Unknown User"} {replyingToMessage.sender?.lastname ? ` ${replyingToMessage.sender.lastname.charAt(0)}.` : ""}
                </span>
                <span className="text-sm text-foreground/80 truncate max-w-xl">
                  {replyingToMessage.content.replace(/@\[(.*?)\]\(user:[a-zA-Z0-9-]+\)/g, '@$1')}
                </span>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-base-200 transition-colors shrink-0 cursor-pointer"
                onClick={() => setReplyingTo(null)}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-8 w-full pl-4 p-2">
            <div className="relative flex-1 bg-transparent group">
              <div
                ref={backdropRef}
                className="absolute inset-0 pointer-events-none text-sm whitespace-pre-wrap wrap-break-word overflow-hidden"
                aria-hidden="true"
              >
                {!content ? (
                  <span className="text-muted-foreground/50">Type a message...</span>
                ) : (
                  <>
                    {renderColoredText(content)}
                    {content.endsWith('\n') ? <br /> : null}
                  </>
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onScroll={(e) => {
                  if (backdropRef.current) {
                    backdropRef.current.scrollTop = e.currentTarget.scrollTop;
                  }
                }}
                rows={1}
                disabled={disabled}
                className={cn(
                  "block w-full bg-transparent text-transparent caret-foreground text-sm resize-none outline-none max-h-40 scrollbar-thin",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                spellCheck="false"
              />
            </div>
            <div className="flex items-center gap-2 relative">
              <button
                ref={emojiButtonRef}
                type="button"
                disabled={disabled}
                onClick={() => setEmojiPickerOpen((prev) => !prev)}
                className={cn(
                  "p-1.75 text-muted-foreground hover:text-foreground hover:bg-base-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-20",
                  emojiPickerOpen && "bg-base-200 text-foreground"
                )}
              >
                <HugeiconsIcon icon={Happy01Icon} strokeWidth={2} className="size-4.5" />
              </button>

              <div 
                ref={emojiPickerRef}
                className={cn(
                  "absolute bottom-full right-0 mb-3 z-50 origin-bottom-right transition-all duration-200 ease-out flex",
                  emojiPickerOpen ? "opacity-100 scale-100 translate-y-0" : "invisible opacity-0 scale-95 translate-y-2 pointer-events-none"
                )}
              >
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!content.trim() || disabled}
                className={cn(
                  "shrink-0 p-1.75 rounded-lg flex items-center justify-center transition-all",
                  content.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    : "text-muted-foreground cursor-not-allowed",
                )}
              >
                <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

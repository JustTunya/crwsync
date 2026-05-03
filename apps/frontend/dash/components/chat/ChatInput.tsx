"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Cancel01Icon, Happy01Icon, Task01Icon } from "@hugeicons/core-free-icons";
import type { WorkspaceMember } from "@crwsync/types";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useChatStore } from "@/hooks/use-chat-store";
import { UserAvatar } from "@/components/user-avatar";
import EmojiPicker from "@/components/chat/EmojiPicker";
import { cn } from "@/lib/utils";
import { searchWorkspaceTasks, type TaskSearchResult } from "@/services/board.service";

type MentionOption = 
  | { type: "user"; user: NonNullable<WorkspaceMember["user"]> }
  | { type: "everyone" };

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-red-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-blue-500",
  NONE: "text-muted-foreground",
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-500",
  NONE: "bg-muted-foreground",
};

interface ChatInputProps {
  workspaceId: string;
  onSend: (content: string, mentionedUserIds: string[], isEveryoneMention: boolean) => void;
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
  const isTypingRef = useRef(false);

  // ── Task mention state ────────────────────────────────────────────────
  const [taskMentionState, setTaskMentionState] = useState({ active: false, text: "", startIndex: -1 });
  const [taskResults, setTaskResults] = useState<TaskSearchResult[]>([]);
  const [taskSearchLoading, setTaskSearchLoading] = useState(false);
  const [taskSelectedIndex, setTaskSelectedIndex] = useState(0);
  const [mentionedTasks, setMentionedTasks] = useState<Record<string, TaskSearchResult>>({});
  const taskDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── User mention state ────────────────────────────────────────────────
  const [mentionState, setMentionState] = useState({ active: false, text: "", startIndex: -1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const triggerTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      if (onTypingStart) {
        onTypingStart();
      }
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
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
    const userMentionPattern = escaped.join("|");
    // 1. Highlight existing full task tokens: #[shortId: Title](task:boardId:taskId)
    const taskTokenPattern = /#\[.*?\]\(task:[a-zA-Z0-9-]+:[a-zA-Z0-9-]+\)/;
    // 2. Highlight short task tokens: #MSC-1
    const shortTaskPattern = /#([A-Z0-9]+-[0-9]+)/;
    
    const regex = new RegExp(
      `(${taskTokenPattern.source})|(${shortTaskPattern.source})|(^|\\n|\\s)(${userMentionPattern})(?=$|\\s|\\n|[.,!?;:])`,
      "g"
    );
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        // full task token
        if (match.index > lastIndex) {
          parts.push(<span key={lastIndex} className="text-foreground">{text.slice(lastIndex, match.index)}</span>);
        }
        const tokenText = match[1].replace(/#\[(.*?)\]\(task:.*?\)/, '#$1');
        parts.push(<span key={match.index} className="text-foreground font-semibold">{tokenText}</span>);
        lastIndex = match.index + match[1].length;
        regex.lastIndex = lastIndex;
      } else if (match[2]) {
        // short task token (#MSC-1)
        const shortId = match[2].slice(1);
        const isKnown = !!mentionedTasks[shortId];
        if (match.index > lastIndex) {
          parts.push(<span key={lastIndex} className="text-foreground">{text.slice(lastIndex, match.index)}</span>);
        }
        parts.push(
          <span 
            key={match.index} 
            className={cn("font-semibold transition-colors", isKnown ? "text-foreground" : "text-foreground/60")}
          >
            {match[2]}
          </span>
        );
        lastIndex = match.index + match[2].length;
        regex.lastIndex = lastIndex;
      } else if (match[4]) {
        // user mention
        const matchStart = match.index + match[3].length;
        const matchEnd = matchStart + match[4].length;
        if (matchStart > lastIndex) {
          parts.push(<span key={lastIndex} className="text-foreground">{text.slice(lastIndex, matchStart)}</span>);
        }
        parts.push(<span key={matchStart} className="text-info">{match[4]}</span>);
        lastIndex = matchEnd;
        regex.lastIndex = matchEnd;
      }
    }
    
    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex} className="text-foreground">{text.slice(lastIndex)}</span>);
    }
    
    return parts;
  };

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
  const clampedTaskSelectedIndex = Math.max(0, Math.min(taskSelectedIndex, taskResults.length - 1));

  // Debounced task search
  useEffect(() => {
    if (!taskMentionState.active) {
      setTaskResults([]);
      return;
    }
    if (taskDebounceRef.current) clearTimeout(taskDebounceRef.current);
    taskDebounceRef.current = setTimeout(async () => {
      setTaskSearchLoading(true);
      const result = await searchWorkspaceTasks(workspaceId, taskMentionState.text);
      setTaskSearchLoading(false);
      if (result.success && result.data) {
        setTaskResults(result.data);
      } else {
        setTaskResults([]);
      }
    }, 250);
    return () => { if (taskDebounceRef.current) clearTimeout(taskDebounceRef.current); };
  }, [taskMentionState.active, taskMentionState.text, workspaceId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  const handleSubmit = () => {
    if (!content.trim() || disabled) return;

    let processedContent = content;

    // 1. Expand short task mentions (#MSC-1) to full tokens
    const shortTaskRegex = /#([A-Z0-9]+-[0-9]+)/g;
    processedContent = processedContent.replace(shortTaskRegex, (match, shortId) => {
      const task = mentionedTasks[shortId];
      if (task) {
        return `#[${task.shortId}: ${task.title}](task:${task.boardId}:${task.id})`;
      }
      return match;
    });

    // 2. Process user mentions
    if (activeMentions.length > 0) {
      const escaped = activeMentions.map(m => m.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`(^|\\n|\\s)(${escaped.join("|")})(?=$|\\s|\\n|[.,!?;:])`, "g");
      processedContent = processedContent.replace(regex, (match, p1, p2) => {
        const mention = activeMentions.find(m => m.display === p2);
        return p1 + (mention ? mention.replaceWith : p2);
      });
    }

    const mentionedUserIds = [...processedContent.matchAll(/@\[.*?\]\(user:([a-zA-Z0-9-]+)\)/g)].map(m => m[1]);
    const isEveryoneMention = processedContent.includes("@everyone");
    onSend(processedContent, mentionedUserIds, isEveryoneMention);
    setContent("");
    setMentionState({ active: false, text: "", startIndex: -1 });
    setTaskMentionState({ active: false, text: "", startIndex: -1 });
    setMentionedTasks({});
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
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

  const insertTaskMention = useCallback((task: TaskSearchResult) => {
    // Save metadata for expansion on submit
    setMentionedTasks(prev => ({ ...prev, [task.shortId]: task }));

    // Display format: #shortId
    const display = `#${task.shortId}`;
    const before = content.slice(0, taskMentionState.startIndex);
    const afterCursor = content.slice(textareaRef.current?.selectionStart || content.length);
    const newContent = before + display + " " + afterCursor;
    
    setContent(newContent);
    setTaskMentionState({ active: false, text: "", startIndex: -1 });
    setTaskResults([]);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = before.length + display.length + 1;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [content, taskMentionState.startIndex, mentionedTasks]);

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
      isTypingRef.current = false;
      if (onTypingStop) onTypingStop();
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);

    // ── Task mention detection (#) ────────────────────────────────────
    const lastHashIndex = textBeforeCursor.lastIndexOf("#");
    if (lastHashIndex !== -1) {
      const charBefore = textBeforeCursor[lastHashIndex - 1];
      if (lastHashIndex === 0 || /[\s\n]/.test(charBefore)) {
        const textAfterHash = textBeforeCursor.slice(lastHashIndex + 1);
        // Don't activate if there's already a completed token bracket at this position
        if (!textAfterHash.includes("]") && !textAfterHash.startsWith(" ") && !/\n/.test(textAfterHash) && textAfterHash.length < 60) {
          setTaskMentionState({ active: true, text: textAfterHash, startIndex: lastHashIndex });
          setMentionState({ active: false, text: "", startIndex: -1 });
          setTaskSelectedIndex(0);
          return;
        }
      }
    }

    // ── User mention detection (@) ────────────────────────────────────
    if (!members) {
      setMentionState({ active: false, text: "", startIndex: -1 });
      setTaskMentionState({ active: false, text: "", startIndex: -1 });
      return;
    }

    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtSymbolIndex !== -1) {
      if (lastAtSymbolIndex === 0 || /[\s\n]/.test(textBeforeCursor[lastAtSymbolIndex - 1])) {
        const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
        if (!textAfterAt.startsWith(" ") && !/\n/.test(textAfterAt) && textAfterAt.length < 50) {
          setMentionState({ active: true, text: textAfterAt, startIndex: lastAtSymbolIndex });
          setTaskMentionState({ active: false, text: "", startIndex: -1 });
          return;
        }
      }
    }
    
    setMentionState({ active: false, text: "", startIndex: -1 });
    setTaskMentionState({ active: false, text: "", startIndex: -1 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (emojiPickerOpen && e.key === "Escape") {
      e.preventDefault();
      setEmojiPickerOpen(false);
      return;
    }

    // Task mention keyboard navigation
    if (taskMentionState.active && taskResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setTaskSelectedIndex((clampedTaskSelectedIndex + 1) % taskResults.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTaskSelectedIndex((clampedTaskSelectedIndex - 1 + taskResults.length) % taskResults.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        insertTaskMention(taskResults[clampedTaskSelectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTaskMentionState({ active: false, text: "", startIndex: -1 });
        return;
      }
    }

    // User mention keyboard navigation
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

  const anyMenuOpen = (taskMentionState.active && (taskResults.length > 0 || taskSearchLoading)) ||
    (mentionState.active && filteredOptions.length > 0);

  return (
    <>
      <div className="relative flex flex-col items-center justify-center w-full px-4 pt-4 pb-6">
        
        {/* Task mention dropdown */}
        {taskMentionState.active && (taskResults.length > 0 || taskSearchLoading) && (
          <div className="mb-3 w-full max-w-2xl max-h-56 overflow-y-auto bg-base-100 backdrop-blur-md border border-base-300 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 scrollbar-thin">
            {taskSearchLoading && taskResults.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <div className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                Searching tasks...
              </div>
            )}
            {taskResults.map((task, idx) => (
              <button
                key={task.id}
                type="button"
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  idx === clampedTaskSelectedIndex ? "bg-primary/10 text-primary" : "hover:bg-base-200 text-foreground"
                )}
                onClick={() => insertTaskMention(task)}
                onMouseEnter={() => setTaskSelectedIndex(idx)}
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                  <HugeiconsIcon icon={Task01Icon} strokeWidth={2} className="size-4" />
                </div>
                <div className="flex flex-col overflow-hidden min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-xs font-mono font-semibold shrink-0", PRIORITY_COLORS[task.priority] ?? "text-muted-foreground")}>
                      {task.shortId}
                    </span>
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground leading-none flex items-center gap-1 mt-0.5">
                    <span className={cn("size-1.5 rounded-full inline-block shrink-0", PRIORITY_DOT[task.priority] ?? "bg-muted-foreground")} />
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()} priority
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* User mention dropdown */}
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
                  {replyingToMessage.content.replace(/@\[(.*?)\]\(user:[a-zA-Z0-9-]+\)/g, '@$1').replace(/#\[(.*?)\]\(task:[a-zA-Z0-9-]+:[a-zA-Z0-9-]+\)/g, '#$1')}
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

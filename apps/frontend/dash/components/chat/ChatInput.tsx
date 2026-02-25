"use client";

import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  const handleSubmit = () => {
    if (!content.trim() || disabled) return;
    onSend(content);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <div className="flex items-center justify-center w-full px-4 pt-4 pb-6">
        <div className="flex items-center gap-8 w-full max-w-2xl pl-4 p-2 bg-muted border-[1.5px] border-base-300 rounded-2xl focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className={cn(
              "flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/50 max-h-40 scrollbar-thin",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || disabled}
            className={cn(
              "shrink-0 p-1.75 rounded-lg flex items-center justify-center transition-all",
              content.trim() && !disabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground cursor-not-allowed",
            )}
          >
            <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4.5" />
          </button>
        </div>
      </div>
    </>
  );
}

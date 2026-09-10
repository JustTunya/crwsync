"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Edit02Icon, Delete02Icon, UnavailableIcon } from "@hugeicons/core-free-icons";
import type { Task, TaskComment, WorkspaceUser } from "@crwsync/types";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import {
  useTaskComments,
  useCreateTaskComment,
  useEditTaskComment,
  useDeleteTaskComment,
  useLoadOlderComments,
} from "@/hooks/use-task-comments";
import { useUser } from "@/providers/user.provider";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export interface TaskCommentsProps {
  task: Task;
  workspaceId: string;
  boardId: string;
}

const MENTION_SPLIT_REGEX = /(@\[.*?\]\(user:[a-zA-Z0-9-]+\))/g;
const MENTION_EXACT_REGEX = /^@\[(.*?)\]\(user:[a-zA-Z0-9-]+\)$/;

function renderMentionText(content: string) {
  return content.split(MENTION_SPLIT_REGEX).map((part, i) => {
    if (!part) return null;
    const mention = part.match(MENTION_EXACT_REGEX);
    if (!mention) return part;
    return (
      <span key={i} className="rounded px-1 py-px bg-info/10 text-info font-semibold">
        @{mention[1]}
      </span>
    );
  });
}

export function TaskComments({ task, workspaceId, boardId }: TaskCommentsProps) {
  const user = useUser();
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { filterMembers, detectAtTrigger, expandMentions, extractMentionedUserIds } =
    useMentionAutocomplete(members);

  const { data: page } = useTaskComments(workspaceId, task.id);
  const createComment = useCreateTaskComment(workspaceId, boardId, task.id);
  const editComment = useEditTaskComment(workspaceId, task.id);
  const deleteComment = useDeleteTaskComment(workspaceId, boardId, task.id);
  const loadOlder = useLoadOlderComments(workspaceId, task.id);

  const [content, setContent] = useState("");
  const [mentionState, setMentionState] = useState({ active: false, text: "", startIndex: -1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = mentionState.active ? filterMembers(mentionState.text) : [];
  const activeIndex = Math.max(0, Math.min(selectedIndex, filteredMembers.length - 1));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  const closeMentions = () => setMentionState({ active: false, text: "", startIndex: -1 });

  const insertMention = (member: WorkspaceUser) => {
    const mentionText = `@${member.firstname} ${member.lastname}`;
    const beforeMention = content.slice(0, mentionState.startIndex);
    const afterCursor = content.slice(textareaRef.current?.selectionStart || content.length);
    setContent(beforeMention + mentionText + " " + afterCursor);
    closeMentions();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = beforeMention.length + mentionText.length + 1;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    setSubmitError(null);
    const atTrigger = members ? detectAtTrigger(value.slice(0, e.target.selectionStart)) : null;
    setSelectedIndex(0);
    setMentionState(atTrigger ? { active: true, ...atTrigger } : { active: false, text: "", startIndex: -1 });
  };

  const handleSubmit = () => {
    if (!content.trim() || createComment.isPending) return;
    const expanded = expandMentions(content);
    createComment.mutate(
      { content: expanded, mentionedUserIds: extractMentionedUserIds(expanded) },
      {
        onSuccess: () => {
          setContent("");
          setSubmitError(null);
          closeMentions();
        },
        onError: (error) => setSubmitError(error instanceof Error ? error.message : "Failed to post comment"),
      },
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((activeIndex + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((activeIndex - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[activeIndex]);
        return;
      }
    }
    if (mentionState.active && e.key === "Escape") {
      e.preventDefault();
      closeMentions();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !(mentionState.active && filteredMembers.length > 0)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setEditError(null);
  };

  const saveEdit = (comment: TaskComment) => {
    if (!editContent.trim()) return;
    if (editContent === comment.content) {
      setEditingId(null);
      return;
    }
    editComment.mutate(
      { commentId: comment.id, data: { content: editContent } },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditError(null);
        },
        onError: (error) => setEditError(error instanceof Error ? error.message : "Failed to save comment"),
      },
    );
  };

  const comments = page?.comments ?? [];
  const activeCommentCount = comments.filter((c) => !c.is_deleted).length;
  const canSend = !!content.trim() && !createComment.isPending;

  return (
    <div className="pt-4 mt-4 border-t border-base-200">
      <label className="text-xs text-muted-foreground mb-2 block">
        Comments{activeCommentCount > 0 ? ` (${activeCommentCount})` : ""}
      </label>

      {page?.has_more && (
        <button
          type="button"
          onClick={() => page.next_cursor && loadOlder.mutate(page.next_cursor)}
          disabled={loadOlder.isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2 disabled:opacity-50"
        >
          {loadOlder.isPending ? "Loading..." : "Load older comments"}
        </button>
      )}

      {comments.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {comments.map((comment) => {
            const isAuthor = comment.author_id === user?.id;
            const isEditing = editingId === comment.id;

            return (
              <div key={comment.id} className="group/comment flex items-start gap-2.5">
                <UserAvatar user={comment.author} size={7} />

                <div
                  className={cn(
                    "flex-1 min-w-0 rounded-lg border-[1.5px] border-base-300 px-3 py-2 transition-colors",
                    comment.is_deleted ? "bg-base-100" : "bg-base-200",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {comment.author ? `${comment.author.firstname} ${comment.author.lastname}` : "Unknown"}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        {comment.is_edited && !comment.is_deleted ? " (edited)" : ""}
                      </span>

                      {isAuthor && !comment.is_deleted && !isEditing && (
                        <div className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover/comment:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Edit comment"
                            onClick={() => startEdit(comment)}
                            className="size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete comment"
                            onClick={() => deleteComment.mutate(comment.id)}
                            className="size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/50 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      <textarea
                        autoFocus
                        value={editContent}
                        onChange={(e) => {
                          setEditContent(e.target.value);
                          setEditError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingId(null);
                          } else if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit(comment);
                          }
                        }}
                        rows={2}
                        className="w-full text-sm leading-snug text-foreground bg-base-100 rounded-md border-[1.5px] border-base-300 px-2.5 py-1.5 resize-none outline-none focus:border-primary/50 transition-colors"
                      />
                      {editError && <p className="text-xs text-error leading-tight">{editError}</p>}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(comment)}
                          disabled={!editContent.trim() || editComment.isPending}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors cursor-pointer"
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  ) : comment.is_deleted ? (
                    <p className="flex items-center gap-1.5 text-sm leading-snug mt-0.5 italic text-muted-foreground">
                      <HugeiconsIcon icon={UnavailableIcon} strokeWidth={1.75} className="size-3.5 shrink-0" />
                      {comment.content}
                    </p>
                  ) : (
                    <p className="text-sm leading-snug mt-0.5 text-foreground whitespace-pre-wrap wrap-break-word">
                      {renderMentionText(comment.content)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative">
        {mentionState.active && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-72 max-w-full max-h-44 overflow-y-auto p-1 flex flex-col gap-0.5 bg-base-100 border-[1.5px] border-base-300 rounded-xl shadow-md shadow-black/5 z-20">
            {filteredMembers.map((member, i) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  i === activeIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-base-200",
                )}
              >
                <UserAvatar user={member} size={6} variant="ghost" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate leading-tight">
                    {member.firstname} {member.lastname}
                  </span>
                  <span className="text-xs text-muted-foreground truncate leading-tight">{member.username}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col bg-base-100 rounded-xl border-[1.5px] border-base-300 focus-within:border-primary/50 transition-colors overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment, or type @ to mention a teammate"
            rows={2}
            className="w-full text-sm leading-snug text-foreground placeholder:text-muted-foreground bg-transparent px-3 pt-2.5 pb-1 resize-none outline-none max-h-40"
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
            <span className="pl-1 text-[10px] text-muted-foreground truncate">
              Enter to post, Shift + Enter for a new line
            </span>
            <button
              type="button"
              title="Post comment"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                "shrink-0 size-7 inline-flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer"
                  : "text-muted-foreground cursor-not-allowed",
              )}
            >
              {createComment.isPending ? (
                <span className="size-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
              ) : (
                <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        {submitError && <p className="text-xs text-error mt-1">{submitError}</p>}
      </div>
    </div>
  );
}

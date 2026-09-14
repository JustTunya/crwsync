"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { WorkspaceInvite, ChatMentionNotification, TaskCommentMentionNotification, TaskAssignedNotification } from "@crwsync/types";
import { acceptInvite, declineInvite } from "@/services/workspace.service";
import { UserAvatar } from "@/components/user-avatar";
import { GlassBox } from "@/components/ui/glassbox";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { AtIcon, Hold05Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";

// ─── Workspace Invite ────────────────────────────────────────────────────────

interface InviteNotificationProps {
  invite: WorkspaceInvite;
}

export function InviteNotification({ invite }: InviteNotificationProps) {
  const status = invite.status;
  const timeAgo = useTimeAgo(invite.created_at);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "accept" | "decline") => {
    setLoading(true);
    
    try {
      if (action === "accept") {
        await acceptInvite(invite.workspace.id);
        router.push(`/${invite.workspace.slug}`);
      } else {
        await declineInvite(invite.workspace.id);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBox className="w-full! gap-3 p-4">
      <div className="flex items-center gap-2 w-full">
          <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0">
            <HugeiconsIcon icon={Hold05Icon} className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs text-primary flex-1 truncate">
            Invitation to <span className="font-semibold">{invite.workspace.name}</span>
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
        </div>

      <div className="flex items-center gap-3">
        <UserAvatar user={invite.creator} />
        <p className="flex-1 min-w-0 wrap-break-word line-clamp-3 text-xs text-muted-foreground font-thin">
          <span className="text-foreground font-medium">{invite.creator.firstname} {invite.creator.lastname}</span> invited you to be a <span className="text-foreground">{invite.role.toLocaleLowerCase()}</span> in <span className="text-foreground font-medium">{invite.workspace.name}</span>.
        </p>
      </div>

      <div className="mt-2 w-full">
        {status === "pending" ? (
          <div className="flex gap-3 w-full">
            <button
              disabled={loading}
              onClick={() => handleAction("decline")}
              aria-label="Decline invitation"
              className="flex-1 py-1 text-xs font-medium text-foreground bg-base-200 hover:bg-base-300 border border-foreground rounded-md disabled:opacity-50 transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("accept")}
              aria-label="Accept invitation"
              className="flex-1 py-1 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50 transition-colors cursor-pointer"
            >
              Accept
            </button>
          </div>
        ) : (
          <div className={cn("text-sm text-center font-semibold", status === "accepted" ? "text-success" : "text-error")}>
            {status === "accepted" ? "You have accepted the invitation" : "You have declined the invitation"}
          </div>
        )}
      </div>
    </GlassBox>
  );
}

// ─── Mention Notification ────────────────────────────────────────────────────

interface MentionNotificationCardProps {
  notification: ChatMentionNotification;
  onDismiss: (id: string) => void;
}

export function stripTokens(text: string): string {
  return text
    .replace(/@\[(.*?)\]\(user:[a-zA-Z0-9-]+\)/g, "@$1")
    .replace(/#\[(.*?)\]\(task:[a-zA-Z0-9-]+:[a-zA-Z0-9-]+\)/g, "#$1");
}

export function MentionNotificationCard({ notification, onDismiss }: MentionNotificationCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const timeAgo = useTimeAgo(notification.createdAt);
  const { message, room, workspace } = notification;

  const senderName = message.sender
    ? `${message.sender.firstname} ${message.sender.lastname}`
    : "Someone";

  const roomName = room.name ?? "a chat room";
  const previewText = stripTokens(message.content);
  const targetPath = `/${workspace.slug}/chat/${room.id}`;

  const scrollToMessage = () => {
    const target = document.getElementById(`message-${message.id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const bubble = target.querySelector(".message-highlight-target");
      if (bubble) {
        bubble.classList.add("!bg-primary/20");
        setTimeout(() => bubble.classList.remove("!bg-primary/20"), 2000);
      }
    }
  };

  const handleNavigate = () => {
    if (pathname === targetPath) {
      // Already in the room — just scroll
      scrollToMessage();
    } else {
      router.push(targetPath);
      // Wait for the new room to mount before scrolling
      setTimeout(scrollToMessage, 800);
    }
    onDismiss(notification.notificationId);
  };


  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Mentioned in #${roomName} by ${senderName}`}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <GlassBox className="w-full! gap-3 p-4">
        {/* Header row */}
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0">
            <HugeiconsIcon icon={AtIcon} className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs text-primary flex-1 truncate">
            Mentioned in <span className="font-semibold">#{roomName}</span>
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
        </div>

        {/* Sender + preview */}
        <div className="flex items-start gap-3 w-full">
          <UserAvatar user={message.sender} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-foreground leading-tight">{senderName}</span>
            <p className="text-xs text-muted-foreground font-thin line-clamp-2 leading-tight wrap-break-word">
              {previewText}
            </p>
          </div>
        </div>
      </GlassBox>
    </div>
  );
}

// ─── Task Comment Mention Notification ───────────────────────────────────────

interface TaskCommentMentionCardProps {
  notification: TaskCommentMentionNotification;
  onDismiss: (id: string) => void;
}

export function TaskCommentMentionCard({ notification, onDismiss }: TaskCommentMentionCardProps) {
  const router = useRouter();
  const timeAgo = useTimeAgo(notification.createdAt);
  const { comment, task, board, workspace } = notification;

  const authorName = comment.author ? `${comment.author.firstname} ${comment.author.lastname}` : "Someone";
  const previewText = stripTokens(comment.content);
  const targetPath = `/${workspace.slug}/board/${board.id}`;

  const handleNavigate = () => {
    router.push(targetPath);
    onDismiss(notification.notificationId);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Mentioned in task ${task.shortId} by ${authorName}`}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <GlassBox className="w-full! gap-3 p-4">
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0">
            <HugeiconsIcon icon={AtIcon} className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs text-primary flex-1 truncate">
            Mentioned in <span className="font-semibold">{task.shortId}: {task.title}</span>
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
        </div>
        <div className="flex items-start gap-2.5 w-full">
          {comment.author && <UserAvatar user={comment.author} size={7} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{authorName}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{previewText}</p>
          </div>
        </div>
      </GlassBox>
    </div>
  );
}

// ─── Task Assigned Notification ──────────────────────────────────────────────

interface TaskAssignedNotificationCardProps {
  notification: TaskAssignedNotification;
  onDismiss: (id: string) => void;
}

export function TaskAssignedNotificationCard({ notification, onDismiss }: TaskAssignedNotificationCardProps) {
  const router = useRouter();
  const timeAgo = useTimeAgo(notification.createdAt);
  const { task, board, workspace, assignedBy } = notification;

  const assignerName = assignedBy ? `${assignedBy.firstname} ${assignedBy.lastname}` : "Someone";
  const targetPath = `/${workspace.slug}/board/${board.id}`;

  const handleNavigate = () => {
    router.push(targetPath);
    onDismiss(notification.notificationId);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Assigned to task ${task.shortId} by ${assignerName}`}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <GlassBox className="w-full! gap-3 p-4">
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs text-primary flex-1 truncate">
            Assigned in <span className="font-semibold">{board.name}</span>
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
        </div>
        <div className="flex items-start gap-2.5 w-full">
          {assignedBy && <UserAvatar user={assignedBy} size={7} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{assignerName}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              Assigned you to {task.shortId}: {task.title}
            </p>
          </div>
        </div>
      </GlassBox>
    </div>
  );
}

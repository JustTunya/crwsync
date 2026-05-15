"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { WorkspaceInvite, MentionNotification } from "@crwsync/types";
import { acceptInvite, declineInvite } from "@/services/workspace.service";
import { UserAvatar } from "@/components/user-avatar";
import { GlassBox } from "@/components/ui/glassbox";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { AtIcon, MessageMultiple01Icon } from "@hugeicons/core-free-icons";

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
    <GlassBox>
      <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">{timeAgo}</span>

      <div className="flex items-center gap-3">
        <UserAvatar user={invite.creator} size={8} />
        <p className="flex-1 min-w-0 wrap-break-word line-clamp-3 text-xs text-muted-foreground font-thin">
          <span className="text-foreground font-semibold">{invite.creator.firstname} {invite.creator.lastname}</span> invited you to be a <span className="text-foreground font-medium">{invite.role.toLocaleLowerCase()}</span> in <span className="text-foreground font-semibold">{invite.workspace.name}</span>.
        </p>
      </div>

      <div className="mt-2">
        {status === "pending" ? (
          <div className="flex gap-3">
            <button
              disabled={loading}
              onClick={() => handleAction("decline")}
              className="flex-1 py-1 text-xs font-medium text-foreground bg-base-200 hover:bg-base-300 border border-foreground rounded-md disabled:opacity-50 transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("accept")}
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
  notification: MentionNotification;
  onDismiss: (id: string) => void;
}

function stripTokens(text: string): string {
  return text
    .replace(/@\[(.*?)\]\(user:[a-zA-Z0-9-]+\)/g, "@$1")
    .replace(/#\[(.*?)\]\(task:[a-zA-Z0-9-]+:[a-zA-Z0-9-]+\)/g, "#$1");
}

export function MentionNotificationCard({ notification, onDismiss }: MentionNotificationCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const timeAgo = useTimeAgo(notification.receivedAt);
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
    <div onClick={handleNavigate}>
    <GlassBox>
      {/* Header row */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0">
          <HugeiconsIcon icon={AtIcon} className="size-3 text-primary" strokeWidth={2.5} />
        </div>
        <span className="text-xs text-primary font-semibold flex-1 truncate">
          Mentioned in <span className="font-bold">#{roomName}</span>
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
      </div>

      {/* Sender + preview */}
      <div className="flex items-start gap-3 mt-1">
        <UserAvatar user={message.sender} size={7} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-foreground leading-tight">{senderName}</span>
          <p className="text-xs text-muted-foreground font-thin line-clamp-2 leading-relaxed mt-0.5 wrap-break-word">
            {previewText}
          </p>
        </div>
      </div>

      {/* Subtle CTA hint */}
      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <HugeiconsIcon icon={MessageMultiple01Icon} className="size-3 text-muted-foreground" strokeWidth={2} />
        <span className="text-[10px] text-muted-foreground">Click to jump to message</span>
      </div>
    </GlassBox>
    </div>
  );
}

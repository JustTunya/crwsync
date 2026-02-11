"use client";

import { useState } from "react";
import { WorkspaceInvite } from "@crwsync/types";
import { acceptInvite, declineInvite } from "@/services/workspace.service";
import { UserAvatar } from "@/components/user-avatar";
import { GlassBox } from "@/components/ui/glassbox";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { cn } from "@/lib/utils";

interface InviteNotificationProps {
  invite: WorkspaceInvite;
}

export function InviteNotification({ invite }: InviteNotificationProps) {
  const status = invite.status;
  const timeAgo = useTimeAgo(invite.created_at);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: "accept" | "decline") => {
    setLoading(true);
    try {
      if (action === "accept") {
        await acceptInvite(invite.workspace.id);
      } else {
        await declineInvite(invite.workspace.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} invite:`, error);
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

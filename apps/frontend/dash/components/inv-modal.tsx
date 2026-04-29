"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, UserAdd01Icon, UserTime01Icon } from "@hugeicons/core-free-icons";
import { InviteMemberPayload, UserType, WorkspacePendingInvite } from "@crwsync/types";
import { Input } from "@/components/ui/input";
import { SidebarProfile } from "@/components/r-sidebar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchUsers } from "@/hooks/use-search-user";
import { inviteMember, getWorkspacePendingInvites, revokeInvite } from "@/services/workspace.service";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";

interface InviteMemberModalProps {
  workspace: {
    id: string | undefined;
    name: string | undefined;
  }
  isOpen: boolean;
  onClose: () => void;
}

//! TODO: Use enum from packages/types
export enum WorkspaceRoleEnum {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  GUEST = "GUEST",
}

export default function InviteMemberModal({ workspace, isOpen, onClose }: InviteMemberModalProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<WorkspaceRoleEnum>(WorkspaceRoleEnum.MEMBER);
  const [showPending, setShowPending] = useState(false);

  const { users } = useSearchUsers(identifier, workspace.id);

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["ws-pending-invites", workspace.id],
    queryFn: () => getWorkspacePendingInvites(workspace.id!),
    enabled: !!workspace.id && showPending,
  });

  const pendingInvites = pendingData?.data ?? [];

  const handleClose = () => {
    setIdentifier("");
    setUser(null);
    setShowPending(false);
    onClose();
  };

  const handleInvite = () => {
    if (!user || !workspace.id) return;
    
    const payload: InviteMemberPayload = {
      invitee_id: user.id,
      role: role as WorkspaceRoleEnum,
    };

    inviteMember(workspace.id, payload).then(() => {
      handleClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50" 
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter") handleClose();
      }}
      role="presentation"
    >
      <div 
        className="flex flex-col gap-4 bg-base-100 rounded-lg p-6 w-full max-w-md" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="relative">
          <h2 className="text-lg text-center font-semibold leading-tight mb-1">
            {showPending ? "Pending Invitations" : `Invite people to ${workspace.name}`}
          </h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {showPending ? "View pending invitations" : "Search by username or email"}
          </p>

          <button
            type="button"
            onClick={() => {
              setShowPending((v) => !v);
              setUser(null);
              setIdentifier("");
            }}
            title={showPending ? "Back to invite" : "View pending invitations"}
            className="absolute top-0 right-0 p-1 rounded-full text-muted-foreground hover:bg-base-200 hover:text-foreground transition-colors cursor-pointer"
          >
            <HugeiconsIcon
              icon={showPending ? UserAdd01Icon : UserTime01Icon}
              strokeWidth={1.5}
              className="size-5"
            />
          </button>
        </div>

        {showPending ? (
          <PendingInvitesList invites={pendingInvites} isLoading={pendingLoading} workspaceId={workspace.id!} />
        ) : (
          <>
            {user ? (
              <>
                <div className="flex flex-row items-center justify-between gap-2">
                  <SidebarProfile user={user} className="hover:bg-transparent cursor-default" />
                  <div className="flex items-center gap-2">
                    <SelectMemberRole role={role as WorkspaceRoleEnum} setRole={setRole} />
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-6 p-1 rounded-full text-muted-foreground hover:bg-base-200 hover:text-foreground transition-colors cursor-pointer" onClick={() => setUser(null)} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <Input 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter username or email"
                  className="bg-base-200"
                />

                {users.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {users.map((u) => (
                      <div 
                        key={u.id} 
                        onClick={() => setUser(u)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setUser(u);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <SidebarProfile user={u} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={handleClose}
                className="w-full py-1 border border-base-foreground text-foreground rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button 
                disabled={!user}
                onClick={handleInvite}
                className="w-full py-1 bg-primary text-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Send Invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Pending Invites List ──────────────────────────────────────────────── */

function PendingInvitesList({
  invites,
  isLoading,
  workspaceId,
}: {
  invites: WorkspacePendingInvite[];
  isLoading: boolean;
  workspaceId: string;
}) {
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());

  const handleCancel = async (inviteId: string) => {
    const confirmed = window.confirm("Are you sure you want to cancel this invitation?");
    if (!confirmed) return;
    await revokeInvite(workspaceId, inviteId);
    setCancelledIds((prev) => new Set(prev).add(inviteId));
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">Loading pending invitations…</p>
    );
  }

  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No pending invitations.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
      {invites.map((invite) => {
        const cancelled = cancelledIds.has(invite.id);
        return (
          <div
            key={invite.id}
            className="flex flex-row items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-base-200 transition-colors"
          >
            {/* Invitee avatar + name */}
            <div className="flex flex-row items-center gap-3 min-w-0">
              <UserAvatar user={invite.invitee} />
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight truncate">
                  {invite.invitee.firstname} {invite.invitee.lastname}
                </p>
                <p className="text-xs text-muted-foreground truncate">@{invite.invitee.username}</p>
              </div>
            </div>

            {/* Right side: meta or CANCELED */}
            {cancelled ? (
              <p className="text-xs font-semibold text-destructive shrink-0">CANCELED</p>
            ) : (
              <div className="flex flex-row items-center gap-2 shrink-0">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-medium text-primary">{invite.role}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(invite.created_at))}
                  </span>
                </div>
                <button
                  type="button"
                  title="Cancel invitation"
                  onClick={() => handleCancel(invite.id)}
                  className="p-1 rounded-full text-muted-foreground hover:bg-base-300 hover:text-destructive transition-colors cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Role Selector ─────────────────────────────────────────────────────── */

interface SelectMemberRoleProps {
  role: WorkspaceRoleEnum;
  setRole: (role: WorkspaceRoleEnum) => void;
}

export function SelectMemberRole({ role, setRole }: SelectMemberRoleProps) {
  return (
    <Select defaultValue={role} value={role} onValueChange={(value) => setRole(value as WorkspaceRoleEnum)}>
      <SelectTrigger className="flex items-center justify-center gap-1 border-none bg-transparent dark:bg-transparent hover:bg-base-200 dark:hover:bg-base-200">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={WorkspaceRoleEnum.ADMIN}>Admin</SelectItem>
          <SelectItem value={WorkspaceRoleEnum.MEMBER}>Member</SelectItem>
          <SelectItem value={WorkspaceRoleEnum.GUEST}>Guest</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  UserAdd01Icon,
  UserTime01Icon,
  Search01Icon,
  CrownIcon,
  UserMultiple02Icon,
  UserIcon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  SparklesIcon,
  Mail01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import {
  InviteMemberPayload,
  UserType,
  WorkspacePendingInvite,
  WorkspaceRoleEnum,
} from "@crwsync/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchUsers } from "@/hooks/use-search-user";
import {
  inviteMember,
  getWorkspacePendingInvites,
  revokeInvite,
} from "@/services/workspace.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

interface InviteMemberModalProps {
  workspace: {
    id: string | undefined;
    name: string | undefined;
  };
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_DETAILS: Record<
  WorkspaceRoleEnum,
  { label: string; description: string; icon: typeof CrownIcon }
> = {
  [WorkspaceRoleEnum.OWNER]: {
    label: "Owner",
    description: "Full control over workspace, billing, and all crew members.",
    icon: CrownIcon,
  },
  [WorkspaceRoleEnum.ADMIN]: {
    label: "Admin",
    description: "Can manage members, invite crew, and configure workspace modules.",
    icon: CrownIcon,
  },
  [WorkspaceRoleEnum.MEMBER]: {
    label: "Member",
    description: "Can create boards, join channels, manage tasks, and upload files.",
    icon: UserMultiple02Icon,
  },
  [WorkspaceRoleEnum.GUEST]: {
    label: "Guest",
    description: "Limited access to collaborate on assigned boards and chat rooms.",
    icon: UserIcon,
  },
};

export default function InviteMemberModal({
  workspace,
  isOpen,
  onClose,
}: InviteMemberModalProps) {
  const [activeTab, setActiveTab] = useState<"invite" | "pending">("invite");
  const [user, setUser] = useState<UserType | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<WorkspaceRoleEnum>(WorkspaceRoleEnum.MEMBER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const queryClient = useQueryClient();
  const { users } = useSearchUsers(identifier, workspace.id);

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["ws-pending-invites", workspace.id],
    queryFn: () => getWorkspacePendingInvites(workspace.id!),
    enabled: !!workspace.id && (isOpen || activeTab === "pending"),
  });

  const pendingInvites = pendingData?.data ?? [];

  const handleClose = () => {
    setIdentifier("");
    setUser(null);
    setRole(WorkspaceRoleEnum.MEMBER);
    setActiveTab("invite");
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleInvite = async () => {
    if (!user || !workspace.id || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: InviteMemberPayload = {
      invitee_id: user.id,
      role: role as WorkspaceRoleEnum,
    };

    try {
      const res = await inviteMember(workspace.id, payload);
      if (res.success) {
        setSuccessMessage(`Invitation sent to ${user.firstname} ${user.lastname}`);
        queryClient.invalidateQueries({
          queryKey: ["ws-pending-invites", workspace.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["ws-members", workspace.id],
        });
        startTransition(() => {
          setTimeout(() => {
            handleClose();
          }, 800);
        });
      } else {
        setErrorMessage(res.message || "Failed to send invitation. Please try again.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred while sending the invite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        data-testid="invite-modal"
        showCloseButton={false}
        className={cn(
          "max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col p-0 gap-0 overflow-hidden",
          "border-[1.5px] border-base-200/90 dark:border-white/10",
          "bg-base-100/95 dark:bg-base-100/90 backdrop-blur-xl shadow-2xl shadow-black/15 rounded-2xl"
        )}
      >
        <DialogTitle className="sr-only">
          {activeTab === "pending"
            ? `Pending Invitations - ${workspace.name || "Workspace"}`
            : `Invite Members to ${workspace.name || "Workspace"}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {activeTab === "pending"
            ? "View and manage sent invitations that are awaiting response."
            : "Search and invite teammates to join your workspace."}
        </DialogDescription>

        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-base-200/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
              <HugeiconsIcon
                icon={activeTab === "pending" ? UserTime01Icon : UserAdd01Icon}
                className="size-5"
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-figtree truncate">
                {activeTab === "pending"
                  ? "Pending Invitations"
                  : `Invite to ${workspace.name || "Workspace"}`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight truncate">
                {activeTab === "pending"
                  ? "Manage sent invitations awaiting response"
                  : "Search crew members to collaborate in real-time"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-base-200 hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        </div>

        {/* SEGMENTED TAB SELECTOR */}
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <div
            role="tablist"
            className="grid grid-cols-2 p-1 rounded-xl bg-base-200/60 border border-base-300/40"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "invite"}
              onClick={() => {
                setActiveTab("invite");
                setErrorMessage(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "invite"
                  ? "bg-base-100 text-foreground shadow-xs border border-base-300/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" strokeWidth={2} />
              <span>Invite Member</span>
            </button>

            <button
              type="button"
              role="tab"
              data-testid="invite-pending-toggle"
              aria-selected={activeTab === "pending"}
              onClick={() => {
                setActiveTab("pending");
                setUser(null);
                setIdentifier("");
                setErrorMessage(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer relative",
                activeTab === "pending"
                  ? "bg-base-100 text-foreground shadow-xs border border-base-300/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon icon={UserTime01Icon} className="size-3.5" strokeWidth={2} />
              <span>Pending Invites</span>
              {pendingInvites.length > 0 && (
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0.2 shrink-0 text-[10px] font-bold rounded-full",
                    activeTab === "pending"
                      ? "bg-primary text-primary-foreground"
                      : "bg-base-300 text-muted-foreground"
                  )}
                >
                  {pendingInvites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto flex-1 min-h-[260px]">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-4 shrink-0" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0" />
              <span className="leading-tight font-medium">{successMessage}</span>
            </div>
          )}

          {activeTab === "pending" ? (
            <PendingInvitesList
              invites={pendingInvites}
              isLoading={pendingLoading}
              workspaceId={workspace.id!}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {user ? (
                /* SELECTED USER CARD */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-base-200/60 border border-base-300/60 dark:border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={user} className="size-10 ring-2 ring-primary/20" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {user.firstname} {user.lastname}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          @{user.username}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUser(null)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-base-300/60 transition-colors cursor-pointer shrink-0"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                      <span>Change</span>
                    </button>
                  </div>

                  {/* ROLE SELECTION */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground font-figtree">
                        Workspace Role
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Permissions & capabilities
                      </span>
                    </div>

                    <SelectMemberRole
                      role={role as WorkspaceRoleEnum}
                      setRole={setRole}
                    />

                    {/* ROLE INFO CALLOUT */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-base-200/40 border border-base-300/40">
                      <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <HugeiconsIcon
                          icon={ROLE_DETAILS[role]?.icon || UserMultiple02Icon}
                          className="size-3.5"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground leading-tight">
                          {ROLE_DETAILS[role]?.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                          {ROLE_DETAILS[role]?.description}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SEARCH USER FORM */
                <div className="flex flex-col gap-3">
                  <label
                    htmlFor="invite-search-input"
                    className={cn(
                      "flex items-center gap-2.5 px-3.5 h-11 w-full rounded-xl",
                      "bg-base-200/70 border border-base-300/60 dark:border-white/10",
                      "focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 focus-within:bg-base-200/90",
                      "transition-all cursor-text"
                    )}
                  >
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="size-4 text-muted-foreground shrink-0"
                      strokeWidth={2}
                    />

                    <input
                      id="invite-search-input"
                      data-testid="invite-search"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Search by username or email..."
                      className={cn(
                        "w-full h-full bg-transparent border-none outline-none ring-0",
                        "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                        "text-sm font-medium text-foreground placeholder:text-muted-foreground/70",
                        "p-0 m-0 leading-normal"
                      )}
                    />

                    {identifier && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIdentifier("");
                        }}
                        aria-label="Clear search"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-base-300/50 transition-colors cursor-pointer shrink-0"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                      </button>
                    )}
                  </label>

                  {/* LIVE SEARCH RESULTS */}
                  {users.length > 0 ? (
                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                      <span className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                        Found Users ({users.length})
                      </span>
                      {users.map((u) => (
                        <div
                          key={u.id}
                          data-testid="invite-user-result"
                          onClick={() => setUser(u)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setUser(u);
                          }}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border border-transparent",
                            "hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10",
                            "bg-base-200/40 transition-all cursor-pointer group"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar user={u} className="size-8 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {u.firstname} {u.lastname}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                @{u.username}
                              </span>
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-base-200 group-hover:bg-primary group-hover:text-primary-foreground text-foreground transition-all shrink-0">
                            <span>Select</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : identifier.trim() ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-xl bg-base-200/30 border border-dashed border-base-300">
                      <div className="size-10 rounded-full bg-base-300/50 flex items-center justify-center text-muted-foreground mb-2">
                        <HugeiconsIcon icon={Search01Icon} className="size-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                        No registered member matched &quot;{identifier}&quot;. Double-check the username or email.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-base-200/40 border border-base-300/40">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={SparklesIcon} className="size-4" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground font-figtree">
                          Real-time Collaboration
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Invited crew members will instantly receive an invitation notification to join this workspace.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-base-200/70 bg-base-100/60 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto px-5 rounded-xl text-xs font-semibold"
          >
            {activeTab === "pending" ? "Close" : "Cancel"}
          </Button>

          {activeTab === "invite" && (
            <Button
              type="button"
              data-testid="invite-send"
              disabled={!user || isSubmitting}
              onClick={handleInvite}
              className={cn(
                "w-full sm:w-auto px-6 rounded-xl text-xs font-semibold",
                "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
                "transition-all duration-150"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Sending...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
                  <span>Send Invite</span>
                </span>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleCancel = async (inviteId: string) => {
    const confirmed = window.confirm("Are you sure you want to cancel this invitation?");
    if (!confirmed) return;

    setRevokingId(inviteId);
    try {
      await revokeInvite(workspaceId, inviteId);
      setCancelledIds((prev) => new Set(prev).add(inviteId));
      queryClient.invalidateQueries({
        queryKey: ["ws-pending-invites", workspaceId],
      });
    } finally {
      setRevokingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl bg-base-200/40 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-base-300/70" />
              <div className="flex flex-col gap-1.5">
                <div className="w-28 h-3.5 rounded-md bg-base-300/70" />
                <div className="w-20 h-2.5 rounded-md bg-base-300/50" />
              </div>
            </div>
            <div className="w-16 h-6 rounded-md bg-base-300/60" />
          </div>
        ))}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4 rounded-xl bg-base-200/30 border border-dashed border-base-300">
        <div className="size-12 rounded-2xl bg-base-300/50 flex items-center justify-center text-muted-foreground mb-3">
          <HugeiconsIcon icon={UserTime01Icon} className="size-6" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-foreground font-figtree">
          No Pending Invitations
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          All workspace invitations have been accepted or no new invitations are pending.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Outstanding ({invites.length})
        </span>
      </div>

      {invites.map((invite) => {
        const cancelled = cancelledIds.has(invite.id);
        const isRevoking = revokingId === invite.id;

        return (
          <div
            key={invite.id}
            className={cn(
              "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all",
              cancelled
                ? "bg-base-200/20 border-base-300/20 opacity-50"
                : "bg-base-200/40 hover:bg-base-200/70 border-base-300/50 dark:border-white/5"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar user={invite.invitee} className="size-9 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight truncate">
                  {invite.invitee?.firstname} {invite.invitee?.lastname}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  @{invite.invitee?.username}
                </span>
              </div>
            </div>

            {cancelled ? (
              <span className="text-[11px] font-bold text-destructive px-2 py-0.5 rounded-md bg-destructive/10 shrink-0">
                REVOKED
              </span>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary uppercase tracking-wide">
                    {invite.role}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(invite.created_at))}
                  </span>
                </div>

                <button
                  type="button"
                  title="Cancel invitation"
                  disabled={isRevoking}
                  onClick={() => handleCancel(invite.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
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
    <Select
      defaultValue={role}
      value={role}
      onValueChange={(value) => setRole(value as WorkspaceRoleEnum)}
    >
      <SelectTrigger
        data-testid="invite-role-select"
        className={cn(
          "w-full h-10 px-3 py-2 bg-base-200/70 border-base-300/60 rounded-xl",
          "hover:bg-base-200 focus:ring-2 focus:ring-primary/40 text-xs font-semibold text-foreground",
          "flex items-center justify-between"
        )}
      >
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent className="bg-base-100 border-[1.5px] border-base-200/90 dark:border-white/10 rounded-xl shadow-xl">
        <SelectGroup>
          <SelectItem
            value={WorkspaceRoleEnum.ADMIN}
            className="text-xs font-semibold py-2.5 rounded-lg cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CrownIcon} className="size-3.5 text-primary" />
              <span>Admin</span>
            </div>
          </SelectItem>
          <SelectItem
            value={WorkspaceRoleEnum.MEMBER}
            className="text-xs font-semibold py-2.5 rounded-lg cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={UserMultiple02Icon} className="size-3.5 text-foreground" />
              <span>Member</span>
            </div>
          </SelectItem>
          <SelectItem
            value={WorkspaceRoleEnum.GUEST}
            className="text-xs font-semibold py-2.5 rounded-lg cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={UserIcon} className="size-3.5 text-muted-foreground" />
              <span>Guest</span>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { CrownIcon, Delete02Icon, UserMultiple02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { WorkspaceMember, WorkspaceRoleEnum } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import {
  workspaceKeys,
  useWorkspaceMembers,
  useWorkspaceRole,
  useUpdateMemberRole,
  useTransferOwnership,
} from "@/hooks/use-workspaces";
import { kickWorkspaceMember } from "@/services/workspace.service";
import { highlightTarget } from "@/hooks/use-highlight-target";
import { UserAvatar } from "@/components/user-avatar";
import { SectionHeader } from "@/components/settings/section-header";
import InviteMemberModal from "@/components/inv-modal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { settingsItemVariants } from "@/components/settings/settings-shell";

const EDITABLE_ROLES = [WorkspaceRoleEnum.ADMIN, WorkspaceRoleEnum.MEMBER, WorkspaceRoleEnum.GUEST];

export function WorkspaceMembersAdmin() {
  const user = useUser();
  const { activeWorkspace: workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const { isOwner, isAdmin } = useWorkspaceRole(workspaceId, user?.id);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<WorkspaceMember | null>(null);

  useEffect(() => {
    const memberId = searchParams.get("memberId");
    if (!memberId || !members?.length) return;

    highlightTarget(`member-${memberId}`);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("memberId");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, members]);

  const queryClient = useQueryClient();
  const roleMutation = useUpdateMemberRole(workspaceId);
  const transferMutation = useTransferOwnership(workspaceId);
  const kickMutation = useMutation({
    mutationFn: (memberId: string) => kickWorkspaceMember(workspaceId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
  });

  const onKick = (member: WorkspaceMember) => {
    if (!confirm(`Remove ${member.user?.username} from the workspace?`)) return;
    kickMutation.mutate(member.user_id);
  };

  const onTransfer = async () => {
    if (!transferTarget) return;
    await transferMutation.mutateAsync(transferTarget.user_id);
    setTransferTarget(null);
  };

  return (
    <section id="members" className="scroll-mt-24">
      <SectionHeader
        icon={UserMultiple02Icon}
        title="Team Members & Permissions"
        description="Manage workspace collaborators, assign administrative roles, and send invitations."
      />

      <motion.div variants={settingsItemVariants}>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Workspace Members</CardTitle>
                {members && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-base-200 text-muted-foreground font-semibold">
                    {members.length}
                  </span>
                )}
              </div>
              <CardDescription>People who have access to this workspace and its boards.</CardDescription>
            </div>

            {isAdmin && (
              <Button
                type="button"
                size="sm"
                className="w-auto text-xs shrink-0"
                onClick={() => setInviteOpen(true)}
              >
                <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5 mr-1.5" strokeWidth={2} />
                Invite Member
              </Button>
            )}
          </CardHeader>

          <CardContent className="mt-2">
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading workspace members...</div>
            )}

            <div className="divide-y divide-border">
              {members?.map((member) => {
                const isSelf = member.user_id === user?.id;
                const isMemberOwner = member.role === WorkspaceRoleEnum.OWNER;

                return (
                  <div
                    key={member.id}
                    id={`member-${member.user_id}`}
                    className="flex items-center gap-3.5 py-3.5 transition-colors"
                  >
                    <UserAvatar user={member.user} size={9} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.user?.firstname} {member.user?.lastname}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-base-200 px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">@{member.user?.username}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberOwner ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                          <HugeiconsIcon icon={CrownIcon} className="size-3.5" strokeWidth={2} />
                          Owner
                        </span>
                      ) : isOwner ? (
                        <Select
                          value={member.role}
                          onValueChange={(role) =>
                            roleMutation.mutate({ memberId: member.user_id, role: role as WorkspaceRoleEnum })
                          }
                        >
                          <SelectTrigger className="w-28 h-8 items-center justify-between px-2.5 text-xs shrink-0" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EDITABLE_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground px-2.5 py-1 rounded bg-base-100 border border-border">
                          {member.role}
                        </span>
                      )}

                      {!isMemberOwner && !isSelf && isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-auto shrink-0 text-xs text-muted-foreground hover:text-primary h-8"
                          onClick={() => setTransferTarget(member)}
                        >
                          Make owner
                        </Button>
                      )}

                      {!isMemberOwner && !isSelf && isAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:border-destructive/30 shrink-0"
                          disabled={kickMutation.isPending}
                          onClick={() => onKick(member)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" strokeWidth={2} />
                          <span className="sr-only">Remove {member.user?.username}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {workspace && (
          <InviteMemberModal
            workspace={{ id: workspace.id, name: workspace.name }}
            isOpen={inviteOpen}
            onClose={() => setInviteOpen(false)}
          />
        )}

        <Dialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer workspace ownership</DialogTitle>
              <DialogDescription>
                {transferTarget?.user?.username} will become the new owner of this workspace, and your role will be
                changed to Admin. This action cannot be undone by you alone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" className="w-auto" onClick={() => setTransferTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-auto"
                disabled={transferMutation.isPending}
                onClick={onTransfer}
              >
                {transferMutation.isPending ? "Transferring..." : "Confirm & Transfer Ownership"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
}

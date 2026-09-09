"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { CrownIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { WorkspaceMember, WorkspaceRoleEnum } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { workspaceKeys, useWorkspaceMembers, useWorkspaceRole, useUpdateMemberRole, useTransferOwnership } from "@/hooks/use-workspaces";
import { kickWorkspaceMember } from "@/services/workspace.service";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { settingsItemVariants } from "@/components/settings/settings-shell";

const EDITABLE_ROLES = [WorkspaceRoleEnum.ADMIN, WorkspaceRoleEnum.MEMBER, WorkspaceRoleEnum.GUEST];

export function WorkspaceMembersAdmin() {
  const user = useUser();
  const { activeWorkspace: workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const { isOwner } = useWorkspaceRole(workspaceId, user?.id);

  const queryClient = useQueryClient();
  const roleMutation = useUpdateMemberRole(workspaceId);
  const transferMutation = useTransferOwnership(workspaceId);
  const kickMutation = useMutation({
    mutationFn: (memberId: string) => kickWorkspaceMember(workspaceId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
  });

  const [transferTarget, setTransferTarget] = useState<WorkspaceMember | null>(null);

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
    <motion.div variants={settingsItemVariants}>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage roles and access for your team.</CardDescription>
        </CardHeader>

        <CardContent className="mt-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading members...</p>}

          {members?.map((member) => {
            const isSelf = member.user_id === user?.id;
            const isMemberOwner = member.role === WorkspaceRoleEnum.OWNER;

            return (
              <div key={member.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                <UserAvatar user={member.user} size={8} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {member.user?.firstname} {member.user?.lastname}
                    {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">You</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.user?.username}</p>
                </div>

                {isMemberOwner ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary px-2 py-1.5 rounded-md bg-primary/10 shrink-0">
                    <HugeiconsIcon icon={CrownIcon} className="size-3.5" strokeWidth={2} />
                    Owner
                  </span>
                ) : isOwner ? (
                  <Select
                    value={member.role}
                    onValueChange={(role) => roleMutation.mutate({ memberId: member.user_id, role: role as WorkspaceRoleEnum })}
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
                  <span className="text-xs font-medium text-muted-foreground px-2 py-1.5 shrink-0">{member.role}</span>
                )}

                {!isMemberOwner && !isSelf && isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-auto shrink-0 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setTransferTarget(member)}
                  >
                    Make owner
                  </Button>
                )}

                {!isMemberOwner && !isSelf && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={kickMutation.isPending}
                    onClick={() => onKick(member)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={2} />
                    <span className="sr-only">Remove {member.user?.username}</span>
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              {transferTarget?.user?.username} will become the workspace owner and you will be demoted to Admin. This
              cannot be undone by you alone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="w-auto" onClick={() => setTransferTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" className="w-auto" disabled={transferMutation.isPending} onClick={onTransfer}>
              {transferMutation.isPending ? "Transferring..." : "Transfer ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

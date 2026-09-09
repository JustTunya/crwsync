"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Workspace } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { useDeleteWorkspace, useWorkspaceRole } from "@/hooks/use-workspaces";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { settingsItemVariants } from "@/components/settings/settings-shell";

export function WorkspaceDangerZone() {
  const user = useUser();
  const { activeWorkspace: workspace } = useWorkspace();
  const { isOwner, isLoading } = useWorkspaceRole(workspace?.id, user?.id);
  const router = useRouter();

  useEffect(() => {
    if (workspace && !isLoading && !isOwner) {
      router.replace(`/${workspace.slug}/settings`);
    }
  }, [workspace, isLoading, isOwner, router]);

  if (!workspace || isLoading || !isOwner) return null;
  return <WorkspaceDangerZoneFields workspace={workspace} />;
}

function WorkspaceDangerZoneFields({ workspace }: { workspace: Workspace }) {
  const { mutateAsync, isPending, error } = useDeleteWorkspace();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const canDelete = confirmName === workspace.name;

  const onDelete = async () => {
    if (!canDelete) return;
    await mutateAsync(workspace.id);
  };

  return (
    <motion.div variants={settingsItemVariants}>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>

        <CardContent className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-card-foreground">Delete this workspace</p>
              <p className="text-xs text-muted-foreground">
                Permanently deletes {workspace.name} and all its boards, chats, and members.
              </p>
            </div>

            <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmName(""); }}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-auto shrink-0">
                  Delete workspace
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {workspace.name}?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the workspace and everything in it. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Type <span className="font-semibold text-foreground">{workspace.name}</span> to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    autoComplete="off"
                  />
                  {error && <p className="text-sm text-destructive">{error.message}</p>}
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" className="w-auto" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-auto"
                    disabled={!canDelete || isPending}
                    onClick={onDelete}
                  >
                    {isPending ? "Deleting..." : "Delete workspace"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

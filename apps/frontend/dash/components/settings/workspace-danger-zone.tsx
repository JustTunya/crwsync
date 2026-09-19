"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, AlertCircleIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Workspace } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { useDeleteWorkspace, useWorkspaceRole } from "@/hooks/use-workspaces";
import { SectionHeader } from "@/components/settings/section-header";
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
    <section id="danger-zone" className="scroll-mt-24">
      <SectionHeader
        icon={Alert02Icon}
        title="Danger Zone"
        description="Irreversible actions that affect the entire workspace and all its members."
      />

      <motion.div variants={settingsItemVariants}>
        <Card className="border-destructive/40 bg-destructive/5 shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-5 text-destructive shrink-0" strokeWidth={2} />
              <CardTitle className="text-destructive">Delete Workspace</CardTitle>
            </div>
            <CardDescription>
              Permanently delete this workspace and all associated boards, channels, chats, and files.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-background border border-destructive/20">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Permanently delete {workspace.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All workspace assets, chat history, files, and memberships will be deleted immediately. This cannot be
                  reversed.
                </p>
              </div>

              <Dialog
                open={open}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (!next) setConfirmName("");
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-auto shrink-0 text-xs">
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1.5" strokeWidth={2} />
                    Delete workspace
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                      <HugeiconsIcon icon={Alert02Icon} className="size-5 shrink-0" />
                      Delete {workspace.name}?
                    </DialogTitle>
                    <DialogDescription>
                      This will permanently delete the workspace and all tasks, discussions, and files within it. This
                      action is immediate and cannot be recovered.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2 py-2">
                    <Label htmlFor="confirm-delete">
                      Type <span className="font-semibold text-foreground select-all">{workspace.name}</span> to confirm
                    </Label>
                    <Input
                      id="confirm-delete"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      autoComplete="off"
                      placeholder={workspace.name}
                    />
                    {error && <p className="text-xs text-destructive">{error.message}</p>}
                  </div>

                  <DialogFooter className="gap-2">
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
                      {isPending ? "Deleting..." : "Permanently Delete Workspace"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

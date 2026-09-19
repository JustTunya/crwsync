"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Settings02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Workspace } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { SectionHeader } from "@/components/settings/section-header";
import { useUpdateWorkspace, useUploadWorkspaceLogo } from "@/hooks/use-workspaces";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function WorkspaceGeneralForm() {
  const { activeWorkspace: workspace } = useWorkspace();
  if (!workspace) return null;
  return <WorkspaceGeneralFormFields workspace={workspace} />;
}

function WorkspaceGeneralFormFields({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const { mutateAsync, isPending, error } = useUpdateWorkspace();
  const { mutateAsync: uploadLogo, isPending: isUploadingLogo, error: logoError } = useUploadWorkspaceLogo();

  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [success, setSuccess] = useState(false);

  const dirty = name !== workspace.name || slug !== workspace.slug;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(false);
    try {
      await mutateAsync({ id: workspace.id, data: { name, slug } });
      setSuccess(true);
      if (slug !== workspace.slug) router.replace(`/${slug}/settings`);
    } catch {
      return;
    }
  };

  return (
    <section id="general" className="scroll-mt-24">
      <SectionHeader
        icon={Settings02Icon}
        title="General Information"
        description="Manage your workspace identity, display name, icon, and custom URL handle."
        showDivider={false}
      />

      <motion.div variants={settingsItemVariants}>
        <Card>
          <form onSubmit={onSubmit}>
            <CardHeader>
              <CardTitle>Workspace Details</CardTitle>
              <CardDescription>Public identification and navigation attributes for this workspace.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 mt-2">
              <div className="space-y-2">
                <Label>Workspace Icon</Label>
                <AvatarUpload
                  preview={
                    <WorkspaceAvatar
                      avatar_key={workspace.logo_key ?? undefined}
                      name={workspace.name}
                      className="size-16 rounded-xl text-base shadow-sm"
                    />
                  }
                  previewClassName="size-16 rounded-xl object-cover shadow-sm"
                  isUploading={isUploadingLogo}
                  error={logoError?.message}
                  onSelect={(file) => uploadLogo({ workspaceId: workspace.id, file })}
                />
                <p className="text-xs text-muted-foreground">Recommended size: 256x256px PNG, SVG, or WebP.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ws-name">Workspace name</Label>
                  <Input
                    id="ws-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSuccess(false);
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ws-slug">Workspace handle</Label>
                  <Input
                    id="ws-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSuccess(false);
                    }}
                    prefix={<span className="text-muted-foreground font-mono text-xs">/</span>}
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error.message}</p>}
              {success && !isPending && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm font-medium border border-success/20">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0" strokeWidth={2} />
                  <span>Workspace settings updated successfully.</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="mt-4 justify-end">
              <Button type="submit" size="sm" className="w-auto" disabled={!dirty || isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </section>
  );
}

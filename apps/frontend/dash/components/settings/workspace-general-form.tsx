"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Workspace } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
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
    <motion.div variants={settingsItemVariants}>
      <Card>
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Update your workspace name and URL.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 mt-4">
            <AvatarUpload
              preview={<WorkspaceAvatar avatar_key={workspace.logo_key ?? undefined} name={workspace.name} className="size-16 rounded-lg" />}
              isUploading={isUploadingLogo}
              error={logoError?.message}
              onSelect={(file) => uploadLogo({ workspaceId: workspace.id, file })}
            />

            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ws-slug">Workspace slug</Label>
              <Input id="ws-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}
            {success && !isPending && <p className="text-sm text-success">Workspace updated.</p>}
          </CardContent>

          <CardFooter className="mt-6 justify-end">
            <Button type="submit" size="sm" className="w-auto" disabled={!dirty || isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

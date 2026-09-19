"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, Mail01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { SessionUserType } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { SectionHeader } from "@/components/settings/section-header";
import { useUpdateUserProfile, useUploadUserAvatar } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";

export function ProfileForm() {
  const user = useUser();
  if (!user) return null;
  return <ProfileFormFields user={user} />;
}

function ProfileFormFields({ user }: { user: SessionUserType }) {
  const { mutateAsync, isPending, error } = useUpdateUserProfile();
  const { mutateAsync: uploadAvatar, isPending: isUploadingAvatar, error: avatarError } = useUploadUserAvatar();

  const [firstname, setFirstname] = useState(user.firstname);
  const [lastname, setLastname] = useState(user.lastname);
  const [username, setUsername] = useState(user.username);
  const [success, setSuccess] = useState(false);

  const dirty = firstname !== user.firstname || lastname !== user.lastname || username !== user.username;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(false);
    try {
      await mutateAsync({ userId: user.id, data: { firstname, lastname, username } });
      setSuccess(true);
    } catch {
      return;
    }
  };

  return (
    <section id="profile" className="scroll-mt-24">
      <SectionHeader
        icon={UserIcon}
        title="Personal Profile"
        description="Update your personal details, public display name, and avatar across all workspaces."
        showDivider={false}
      />

      <motion.div variants={settingsItemVariants}>
        <Card>
          <form onSubmit={onSubmit}>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your public identity on crwsync boards and discussions.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 mt-2">
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <AvatarUpload
                  preview={<UserAvatar user={user} size={16} />}
                  previewClassName="size-16 rounded-full object-cover shadow-sm"
                  isUploading={isUploadingAvatar}
                  error={avatarError?.message}
                  onSelect={(file) => uploadAvatar({ userId: user.id, file })}
                />
                <p className="text-xs text-muted-foreground">Supported formats: PNG, JPG, GIF, WebP up to 5MB.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">First name</Label>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={(e) => {
                      setFirstname(e.target.value);
                      setSuccess(false);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Last name</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={(e) => {
                      setLastname(e.target.value);
                      setSuccess(false);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setSuccess(false);
                    }}
                    prefix={<span className="text-muted-foreground font-mono text-xs">@</span>}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    value={user.email}
                    readOnly
                    disabled
                    prefix={<HugeiconsIcon icon={Mail01Icon} className="size-4 text-muted-foreground" />}
                    suffix={
                      <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
                        Verified
                      </span>
                    }
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error.message}</p>}
              {success && !isPending && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm font-medium border border-success/20">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0" strokeWidth={2} />
                  <span>Profile updated successfully.</span>
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

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SessionUserType } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
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
    <motion.div variants={settingsItemVariants}>
      <Card>
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and username.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 mt-4">
            <AvatarUpload
              preview={<UserAvatar user={user} size={16} />}
              isUploading={isUploadingAvatar}
              error={avatarError?.message}
              onSelect={(file) => uploadAvatar({ userId: user.id, file })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">First name</Label>
                <Input id="firstname" value={firstname} onChange={(e) => setFirstname(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Last name</Label>
                <Input id="lastname" value={lastname} onChange={(e) => setLastname(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}
            {success && !isPending && <p className="text-sm text-success">Profile updated.</p>}
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

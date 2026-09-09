"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface WorkspaceAvatarProps {
  avatar_key?: string;
  name?: string;
  className?: string;
}

export function WorkspaceAvatar({ avatar_key, name, className }: WorkspaceAvatarProps) {
  const initials = `${name?.charAt(0) ?? ""}${name?.charAt(1) ?? ""}`.toUpperCase();

  const [imageFailed, setImageFailed] = useState(false);

  if (avatar_key && !imageFailed) {
    const avatarUrl = `${process.env.NEXT_PUBLIC_API_URL}/avatars/${avatar_key}`;

    return (
      <img
        src={avatarUrl}
        alt={`${name} workspace avatar`}
        className={cn("size-6 rounded-sm object-cover", className)}
        onError={() => setImageFailed(true)}
      />
    );
  } else {
    return (
      <div className={cn("flex items-center justify-center size-6 rounded-sm bg-primary text-xs", className)}>
        <span className="text-primary-foreground font-semibold">{initials}</span>
      </div>
    );
  }
}
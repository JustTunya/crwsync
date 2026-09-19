"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  size?: number;
  user?: {
    firstname?: string;
    lastname?: string;
    name?: string;
    avatar_key?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  } | null;
  status?: string;
  variant?: "default" | "ghost";
  className?: string;
}

export function UserAvatar({ size = 7, user, status, variant = "default", className }: UserAvatarProps) {
  let initials = "";
  if (user?.firstname || user?.lastname) {
    initials = `${user?.firstname?.charAt(0) ?? ""}${user?.lastname?.charAt(0) ?? ""}`.toUpperCase();
  } else if (user?.name) {
    initials = user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  const displayName = user?.name || `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim() || "User";
  const rawUrl = user?.avatarUrl || user?.avatar_url || user?.avatar_key;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const avatarUrl = rawUrl
    ? rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("/")
      ? rawUrl
      : `${apiUrl}/avatars/${rawUrl}`
    : null;
  const pixels = size * 4;

  const STATUS_RING: Record<string, string> = {
    "offline": "ring-muted-foreground",
    "online": "ring-success",
    "away": "ring-warning",
    "busy": "ring-error",
  };

  const STATUS_INDICATOR: Record<string, string> = {
    "offline": "bg-muted-foreground",
    "online": "bg-success",
    "away": "bg-warning",
    "busy": "bg-error",
  };

  const [imageFailed, setImageFailed] = useState(false);

  if (avatarUrl && !imageFailed) {
    return (
      <div className={cn(status && ["ring-1", STATUS_RING[status]], "relative shrink-0 ring-offset-2 ring-offset-base-200 rounded-full", className)} style={{ width: pixels, height: pixels }}>
        <Image
          src={avatarUrl}
          alt={`${displayName} avatar`}
          title={displayName}
          width={pixels}
          height={pixels}
          className="rounded-full object-cover size-full"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
        {status && <div className={cn("absolute -bottom-px -right-px size-2 rounded-full outline-2 outline-base-200", STATUS_INDICATOR[status])} />}
      </div>
    );
  } else {
    return (
      <div
        className={cn(status && ["ring-1", STATUS_RING[status]], "relative flex items-center justify-center bg-primary rounded-full ring-offset-2 ring-offset-base-200 shrink-0", variant === "ghost" && "bg-primary/10", className)}
        style={{ width: pixels, height: pixels }}
      >
        <span title={displayName} className={cn("text-primary-foreground font-semibold", variant === "ghost" && "text-primary")} style={{ fontSize: pixels * 0.45 }}>{initials}</span>
        {status && <div className={cn("absolute -bottom-px -right-px size-2 rounded-full outline-2 outline-base-200", STATUS_INDICATOR[status])} />}
      </div>
    );
  }
}
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  size?: number;
  user?: { firstname: string; lastname: string; avatar_key?: string | null } | null;
  status?: string;
  variant?: "default" | "ghost";
  className?: string;
}

export function UserAvatar({ size = 7, user, status, variant = "default", className }: UserAvatarProps) {
  const initials = `${user?.firstname?.charAt(0) ?? ""}${user?.lastname?.charAt(0) ?? ""}`.toUpperCase();
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

  if (user && user.avatar_key) {
    const avatarUrl = `/api/avatars/${user.avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${user.firstname} ${user.lastname} avatar`}
        title={`${user.firstname} ${user.lastname}`}
        className={cn("rounded-full object-cover", className)}
        width={pixels}
        height={pixels}
        priority
      />
    );
  } else {
    return (
        <div
          className={cn(status && ["ring-1", STATUS_RING[status]], "relative flex items-center justify-center bg-primary rounded-full ring-offset-2 ring-offset-base-200 shrink-0", variant === "ghost" && "bg-primary/10", className)}
          style={{ width: pixels, height: pixels }}
        >
          <span title={`${user?.firstname} ${user?.lastname}`} className={cn("text-primary-foreground font-semibold", variant === "ghost" && "text-primary")} style={{ fontSize: pixels * 0.5 }}>{initials}</span>
          {status && <div className={cn("absolute -bottom-px -right-px size-2 rounded-full outline-2 outline-base-200", STATUS_INDICATOR[status])} />}
        </div>
    );
  }
}
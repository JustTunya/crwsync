import Image from "next/image";
import { SessionUserType, WorkspaceUser } from "@crwsync/types";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  size?: number;
  user?: SessionUserType | WorkspaceUser | null;
  status?: string;
  className?: string;
}

export function UserAvatar({ size = 7, user, status, className }: UserAvatarProps) {
  const initials = `${user?.firstname?.charAt(0) ?? ""}${user?.lastname?.charAt(0) ?? ""}`.toUpperCase();
  const pixels = size * 4;

  if (user && user.avatar_key) {
    const avatarUrl = `/api/avatars/${user.avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${user.firstname} ${user.lastname} avatar`}
        className={cn("rounded-full object-cover", className)}
        width={pixels}
        height={pixels}
        priority
      />
    );
  } else {
    return (
        <div
          className={cn(status && "ring-1", "relative flex items-center justify-center bg-primary rounded-full ring-offset-2 ring-offset-base-200 shrink-0", className, {
            "ring-green-500": status === "online",
            "ring-gray-400": status === "offline",
            "ring-red-500": status === "busy",
            "ring-yellow-500": status === "away",
          })}
          style={{ width: pixels, height: pixels }}
        >
          <span className="text-primary-foreground text-sm font-semibold">{initials}</span>

          {status && <div className={cn("absolute -bottom-px -right-px size-2 rounded-full outline-2 outline-base-200", {
            "bg-green-500": status === "online",
            "bg-gray-400": status === "offline",
            "bg-red-500": status === "busy",
            "bg-yellow-500": status === "away",
          })} />}
        </div>
    );
  }
}
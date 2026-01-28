import Image from "next/image";
import { SessionUserType } from "@crwsync/types";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  size?: number;
  user?: SessionUserType;
  status?: "online" | "offline" | "busy" | "away";
}

export default function UserAvatar({ size = 7, user, status }: UserAvatarProps) {
  const initials = `${user?.firstname?.charAt(0) ?? ""}${user?.lastname?.charAt(0) ?? ""}`.toUpperCase();
  const pixels = size * 4;

  if (user && user.avatar_key) {
    const avatarUrl = `/api/avatars/${user.avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${user.firstname} ${user.lastname} avatar`}
        className="rounded-full object-cover"
        width={pixels}
        height={pixels}
        priority
      />
    );
  } else {
    return (
        <div
          className={cn("shrink-0 rounded-full bg-primary flex items-center justify-center relative ring-1 ring-offset-2 ring-offset-base-200", {
            "ring-green-500": status === "online",
            "ring-gray-400": status === "offline",
            "ring-red-500": status === "busy",
            "ring-yellow-500": status === "away",
          })}
          style={{ width: pixels, height: pixels }}
        >
          <span className="text-primary-foreground text-sm font-semibold">{initials}</span>

          <div className={cn("absolute -bottom-px -right-px size-2 rounded-full outline-2 outline-base-200", {
            "bg-green-500": status === "online",
            "bg-gray-400": status === "offline",
            "bg-red-500": status === "busy",
            "bg-yellow-500": status === "away",
          })} />
        </div>
    );
  }
}
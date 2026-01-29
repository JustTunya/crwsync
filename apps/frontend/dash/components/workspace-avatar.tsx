import { cn } from "@/lib/utils";
import Image from "next/image";

interface WorkspaceAvatarProps {
  avatar_key?: string;
  name?: string;
  className?: string;
}

export default function WorkspaceAvatar({ avatar_key, name, className }: WorkspaceAvatarProps) {
  const initials = `${name?.charAt(0) ?? ""}${name?.charAt(1) ?? ""}`.toUpperCase();

  if (avatar_key) {
    const avatarUrl = `/api/avatars/${avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${name} workspace avatar`}
        className={cn("size-6 rounded-sm object-cover", className)}
        width={24}
        height={24}
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
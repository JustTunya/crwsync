import Image from "next/image";

interface WorkspaceAvatarProps {
  avatar_key?: string;
  name?: string;
}

export default function WorkspaceAvatar({ avatar_key, name }: WorkspaceAvatarProps) {
  const initials = `${name?.charAt(0) ?? ""}${name?.charAt(1) ?? ""}`.toUpperCase();

  if (avatar_key) {
    const avatarUrl = `/api/avatars/${avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${name} workspace avatar`}
        className="size-6 rounded-md object-cover"
        width={24}
        height={24}
      />
    );
  } else {
    return (
      <div className="size-6 rounded-md bg-primary flex items-center justify-center">
        <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
      </div>
    );
  }
}
import { UserAvatar } from "@/components/user-avatar";

export interface TypingUser {
  id: string;
  firstname: string;
  lastname: string;
  avatar_key?: string | null;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const MAX_VISIBLE = 3;
  const showTruncated = typingUsers.length > MAX_VISIBLE;
  const visibleUsers = showTruncated ? typingUsers.slice(0, 2) : typingUsers.slice(0, MAX_VISIBLE);
  const remainingCount = typingUsers.length - visibleUsers.length;

  return (
    <div className="flex items-end gap-2 pt-4 py-2 mt-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex -space-x-3">
        {visibleUsers.map((user, i) => (
          <div key={user.id} style={{ zIndex: visibleUsers.length - i }}>
            <UserAvatar
              user={{
                firstname: user.firstname,
                lastname: user.lastname,
                avatar_key: user.avatar_key,
              }}
              size={7}
              className="ring-2 ring-background z-10"
            />
          </div>
        ))}
        {showTruncated && (
          <div 
            className="relative flex items-center justify-center bg-muted rounded-full ring-2 ring-background shrink-0"
            style={{ width: "28px", height: "28px", zIndex: 0 }}
          >
            <span className="text-muted-foreground text-xs font-semibold">+{remainingCount}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-0.5 justify-end p-2.5 pb-0.5 text-sm leading-relaxed whitespace-pre-wrap bg-muted text-muted-foreground font-black rounded-2xl rounded-bl-xs">
        <div className="animate-bounce [animation-delay:-0.3s]">&bull;</div>
        <div className="animate-bounce [animation-delay:-0.15s]">&bull;</div>
        <div className="animate-bounce">&bull;</div>
      </div>
    </div>
  );
}

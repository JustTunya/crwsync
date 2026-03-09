import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MessageReaction } from "@crwsync/types";
import ReactionListModal from "@/components/chat/ReactionListModal";

interface ReactionIndicatorProps {
  reactions: MessageReaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

export function ReactionIndicator({ reactions, currentUserId, onToggleReaction }: ReactionIndicatorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        hasReacted: false,
        firstReactedAt: new Date(reaction.created_at).getTime(),
      };
    }
    acc[reaction.emoji].count += 1;
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasReacted = true;
    }
    if (new Date(reaction.created_at).getTime() < acc[reaction.emoji].firstReactedAt) {
      acc[reaction.emoji].firstReactedAt = new Date(reaction.created_at).getTime();
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; hasReacted: boolean; firstReactedAt: number }>);

  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.firstReactedAt - b.firstReactedAt;
  });

  const totalCount = reactions.length;
  const topEmojis = sortedGroups.slice(0, 3);
  const userHasReactedToAny = sortedGroups.some((g) => g.hasReacted);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "flex items-center justify-center gap-0.5 px-1 py-0.5 rounded-full text-xs font-medium transition-colors border cursor-pointer",
          userHasReactedToAny 
            ? "bg-primary/15 border-primary/30 hover:bg-primary/30 text-primary-foreground" 
            : "bg-base-100 border-base-300 hover:bg-base-200 text-muted-foreground"
        )}
      >
        <div className="flex -space-x-1">
          {topEmojis.map((g, i) => (
            <span key={g.emoji} className="relative z-10 text-[13px] leading-none select-none drop-shadow-sm" style={{ zIndex: 10 - i }}>
              {g.emoji}
            </span>
          ))}
        </div>
        <span className="mr-0.5">{totalCount}</span>
      </button>

      {isModalOpen && (
        <ReactionListModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          reactions={reactions}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
        />
      )}
    </>
  );
}

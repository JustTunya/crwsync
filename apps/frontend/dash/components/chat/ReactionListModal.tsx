import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MessageReaction } from "@crwsync/types";
import { UserAvatar } from "@/components/user-avatar";

interface ReactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: MessageReaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

export default function ReactionListModal({ isOpen, onClose, reactions, currentUserId, onToggleReaction }: ReactionListModalProps) {
  const [activeTab, setActiveTab] = useState<string>("All");

  const grouped = useMemo(() => {
    const acc: Record<string, number> = {};
    reactions.forEach((r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [reactions]);

  const filteredReactions = useMemo(() => {
    let filtered = reactions;
    if (activeTab !== "All") {
      filtered = reactions.filter((r) => r.emoji === activeTab);
    }
    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [reactions, activeTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-base-100/90 backdrop-blur-md border-base-300">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg font-semibold">Reactions</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 px-4 pb-3 border-b border-base-300/50">
          <button
            autoFocus={false}
            onClick={() => setActiveTab("All")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm",
              activeTab === "All"
                ? "bg-primary text-primary-foreground"
                : "bg-base-200 text-muted-foreground hover:bg-base-300"
            )}
          >
            All <span className="text-xs opacity-70 ml-1">{reactions.length}</span>
          </button>
          
          {grouped.map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => setActiveTab(emoji)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm",
                activeTab === emoji
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-base-200 text-muted-foreground hover:bg-base-300 border border-transparent"
              )}
            >
              <span>{emoji}</span>
              <span className="text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredReactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No reactions found.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredReactions.map((reaction) => {
                const isCurrentUser = reaction.user_id === currentUserId;
                return (
                  <div key={reaction.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-base-200/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={reaction.user ? {
                          firstname: reaction.user.firstname,
                          lastname: reaction.user.lastname,
                          avatar_key: reaction.user.avatar_key,
                        } : { firstname: "Unknown", lastname: "User", avatar_key: null }}
                        size={8}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">
                          {reaction.user ? `${reaction.user.firstname} ${reaction.user.lastname}` : "Unknown User"}
                          {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{reaction.emoji}</span>
                      {isCurrentUser && (
                        <button
                          onClick={() => onToggleReaction(reaction.emoji)}
                          className="text-xs text-muted-foreground hover:text-error transition-colors px-2 py-1 rounded-md hover:bg-error/10"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HomeMemberPresence } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { cn } from "@/lib/utils";

export interface HomeCrewPresenceSectionProps {
  crew?: HomeMemberPresence[];
  slug: string;
  onDirectMessage?: (member: HomeMemberPresence) => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function HomeCrewPresenceSection({ crew, onDirectMessage, className }: HomeCrewPresenceSectionProps) {
  const onlineCount = crew?.filter((member) => member.isOnline).length ?? 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={UserGroupIcon} className="size-4 text-primary" />
          Crew Presence
        </h2>
        <span className="text-xs text-muted-foreground font-medium bg-base-200 px-2 py-0.5 rounded-full">
          {onlineCount} online
        </span>
      </div>

      <GlassBox className="w-full! mx-0! p-4 flex flex-col gap-2.5">
        {crew && crew.length > 0 ? (
          <div className="space-y-1.5" data-testid="home-crew-list">
            {crew.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2.5 p-1.5 rounded-lg hover:bg-base-200/40 transition-colors group"
                data-testid="home-crew-row"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative size-7 rounded-full bg-base-300 text-xs font-semibold flex items-center justify-center shrink-0">
                    {getInitials(member.name)}
                    <span
                      className={cn(
                        "size-2 rounded-full absolute bottom-0 right-0 ring-2 ring-card",
                        member.isOnline ? "bg-success" : "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
                    <span className="text-[10px] font-medium text-muted-foreground bg-base-200/80 px-1.5 py-0.5 rounded capitalize">
                      {member.role.toLowerCase()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title={`Message ${member.name}`}
                  data-testid="home-crew-message-button"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 size-7 rounded-md hover:bg-base-300 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0"
                  onClick={() => onDirectMessage?.(member)}
                >
                  <HugeiconsIcon icon={BubbleChatIcon} className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="home-crew-empty-state">
            No crew members found.
          </p>
        )}
      </GlassBox>
    </div>
  );
}

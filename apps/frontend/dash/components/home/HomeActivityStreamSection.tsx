"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { HomeActivityItem } from "@crwsync/types";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { cn } from "@/lib/utils";

export interface HomeActivityStreamSectionProps {
  activity?: HomeActivityItem[];
  slug: string;
  className?: string;
}

function HomeActivityTimeBadge({ createdAt }: { createdAt: string }) {
  const timeAgo = useTimeAgo(createdAt);
  return <span className="text-[10px] text-muted-foreground/75 shrink-0 font-mono mt-0.5">{timeAgo}</span>;
}

export function HomeActivityStreamSection({ activity, slug, className }: HomeActivityStreamSectionProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Clock01Icon} className="size-4 text-primary" />
          Workspace Pulse
        </h2>
        <span className="text-xs text-muted-foreground font-medium bg-muted/60 border border-border/40 px-2 py-0.5 rounded-full">Live</span>
      </div>

      <Card className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
        {activity && activity.length > 0 ? (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1" data-testid="home-activity-list">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 text-xs group" data-testid="home-activity-row">
                <UserAvatar
                  user={{ name: item.actor.name, avatarUrl: item.actor.avatarUrl }}
                  size={6}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.actor.name}</span> {item.message}{" "}
                  {item.target?.title && (
                    <Link
                      href={item.target.href.startsWith("/") ? item.target.href : `/${slug}${item.target.href}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.target.title}
                    </Link>
                  )}
                </div>
                <HomeActivityTimeBadge createdAt={item.createdAt} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="home-activity-empty-state">
            No recent workspace activity.
          </p>
        )}
      </Card>
    </div>
  );
}

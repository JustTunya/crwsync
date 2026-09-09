"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ComputerIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { ActiveSession } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { useUserSessions, useRevokeSession } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";

function formatSession(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (ua.length <= 60) return ua;
  return `${ua.slice(0, 57)}...`;
}

function SessionRow({ session, userId }: { session: ActiveSession; userId: string }) {
  const { mutate, isPending } = useRevokeSession();

  const onRevoke = () => {
    if (!confirm("Revoke this session? The device will be signed out.")) return;
    mutate({ userId, sessionId: session.id });
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <HugeiconsIcon icon={ComputerIcon} className="size-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate" title={session.ua ?? undefined}>
          {formatSession(session.ua)}
          {session.isCurrent && <span className="ml-2 text-xs font-normal text-primary">This device</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {session.ip ?? "Unknown IP"} · Signed in {new Date(session.created_at).toLocaleString()}
        </p>
      </div>
      {!session.isCurrent && (
        <Button variant="outline" size="icon" disabled={isPending} onClick={onRevoke}>
          <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={2} />
          <span className="sr-only">Revoke session</span>
        </Button>
      )}
    </div>
  );
}

export function SessionsList() {
  const user = useUser();
  const { data: sessions, isLoading } = useUserSessions(user?.id);

  if (!user) return null;

  return (
    <motion.div variants={settingsItemVariants}>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </CardHeader>

        <CardContent className="mt-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading sessions...</p>}
          {!isLoading && sessions?.length === 0 && (
            <p className="text-sm text-muted-foreground">No active sessions.</p>
          )}
          {sessions?.map((session) => (
            <SessionRow key={session.id} session={session} userId={user.id} />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

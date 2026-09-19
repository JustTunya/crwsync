"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ComputerIcon, SmartPhone01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { ActiveSession } from "@crwsync/types";
import { useUser } from "@/providers/user.provider";
import { useUserSessions, useRevokeSession } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";
import { cn } from "@/lib/utils";

function isMobileUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return /Mobile|Android|iPhone|iPad/i.test(ua);
}

function parseDeviceName(ua: string | null): string {
  if (!ua) return "Unknown Browser / Device";
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua)) browser = "Apple Safari";

  let os = "Desktop";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";

  return `${browser} on ${os}`;
}

function SessionRow({ session, userId }: { session: ActiveSession; userId: string }) {
  const { mutate, isPending } = useRevokeSession();
  const isMobile = isMobileUserAgent(session.ua);

  const onRevoke = () => {
    mutate({ userId, sessionId: session.id });
  };

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border last:border-0">
      <div
        className={cn(
          "size-9 rounded-lg flex items-center justify-center shrink-0 border",
          session.isCurrent ? "bg-primary/10 border-primary/20 text-primary" : "bg-base-200 border-border text-muted-foreground"
        )}
      >
        <HugeiconsIcon icon={isMobile ? SmartPhone01Icon : ComputerIcon} className="size-4.5" strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate" title={session.ua ?? undefined}>
            {parseDeviceName(session.ua)}
          </p>
          {session.isCurrent && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              This Device
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {session.ip ?? "Unknown IP"} · Signed in {new Date(session.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {!session.isCurrent && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onRevoke}
          className="text-xs h-8 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1" strokeWidth={2} />
          {isPending ? "Revoking..." : "Revoke"}
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
          <CardTitle>Active Sessions & Devices</CardTitle>
          <CardDescription>Manage browser sessions currently authenticated to your account.</CardDescription>
        </CardHeader>

        <CardContent className="mt-2">
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading active sessions...
            </div>
          )}

          {!isLoading && (!sessions || sessions.length === 0) && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No active sessions recorded.
            </div>
          )}

          <div className="divide-y divide-border">
            {sessions?.map((session) => (
              <SessionRow key={session.id} session={session} userId={user.id} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

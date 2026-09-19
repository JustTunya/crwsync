"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification02Icon,
  Chat01Icon,
  CheckmarkSquare02Icon,
  Comment01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/settings/section-header";
import { settingsItemVariants } from "@/components/settings/settings-shell";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

const getPermissionSnapshot = (): NotificationPermission =>
  typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";

const getPermissionServerSnapshot = (): NotificationPermission => "default";

const getSupportedSnapshot = (): boolean => typeof window !== "undefined" && "Notification" in window;
const getSupportedServerSnapshot = (): boolean => true;

export function NotificationsSection() {
  const permission = useSyncExternalStore(emptySubscribe, getPermissionSnapshot, getPermissionServerSnapshot);
  const supported = useSyncExternalStore(emptySubscribe, getSupportedSnapshot, getSupportedServerSnapshot);
  const [testSent, setTestSent] = useState(false);
  const [, setTick] = useState(0);

  const requestPermission = async () => {
    if (!supported) return;
    try {
      await Notification.requestPermission();
      setTick((t) => t + 1);
    } catch {
      return;
    }
  };

  const sendTestNotification = () => {
    if (permission !== "granted") return;
    try {
      new Notification("crwsync Notification Test", {
        body: "Desktop notifications are working properly!",
        icon: "/web-app-manifest-192x192.png",
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch {
      return;
    }
  };

  const permissionMeta = {
    granted: {
      label: "Enabled",
      badgeClass: "bg-success/10 text-success border-success/20",
      description: "Desktop notifications are allowed and active.",
    },
    denied: {
      label: "Blocked",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      description: "Notifications are blocked by your browser settings. Enable them in site permissions.",
    },
    default: {
      label: "Not Configured",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
      description: "You haven't granted desktop notification permission yet.",
    },
  }[permission];

  return (
    <section id="notifications" className="scroll-mt-24">
      <SectionHeader
        icon={Notification02Icon}
        title="Notifications & Alerts"
        description="Configure how and when crwsync reaches you for real-time workspace updates."
      />

      <motion.div variants={settingsItemVariants} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Desktop Push Notifications</CardTitle>
            <CardDescription>Receive real-time alerts when working in background tabs or windows.</CardDescription>
          </CardHeader>

          <CardContent className="mt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-base-100 border border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Browser Alert Status</p>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-medium",
                      permissionMeta.badgeClass
                    )}
                  >
                    {permissionMeta.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{permissionMeta.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {permission !== "granted" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={requestPermission}
                    disabled={!supported || permission === "denied"}
                    className="w-auto text-xs"
                  >
                    Enable Notifications
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sendTestNotification}
                    className="w-auto text-xs"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5 mr-1 text-success" />
                    {testSent ? "Alert Sent!" : "Send Test Alert"}
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
                Included Notification Events
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-base-100 border border-border space-y-1.5">
                  <div className="flex items-center gap-2 text-primary">
                    <HugeiconsIcon icon={Chat01Icon} className="size-4" strokeWidth={2} />
                    <span className="text-xs font-semibold text-foreground">Chat Mentions</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Direct @mentions in workspace channels and direct messages.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-base-100 border border-border space-y-1.5">
                  <div className="flex items-center gap-2 text-primary">
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} className="size-4" strokeWidth={2} />
                    <span className="text-xs font-semibold text-foreground">Task Assignments</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Whenever teammates assign or reassign board tasks to you.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-base-100 border border-border space-y-1.5">
                  <div className="flex items-center gap-2 text-primary">
                    <HugeiconsIcon icon={Comment01Icon} className="size-4" strokeWidth={2} />
                    <span className="text-xs font-semibold text-foreground">Task Comments</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Mentions and activity in discussions on tasks you follow.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

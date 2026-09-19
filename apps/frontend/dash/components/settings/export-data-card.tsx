"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, CheckmarkCircle02Icon, File01Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { useExportUserData } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";

export function ExportDataCard() {
  const user = useUser();
  const { mutateAsync, isPending, error } = useExportUserData();
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const onExport = async () => {
    setSuccess(false);
    try {
      const data = await mutateAsync(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `crwsync-export-${user.username}-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch {
      return;
    }
  };

  return (
    <motion.div variants={settingsItemVariants}>
      <Card>
        <CardHeader>
          <CardTitle>Export Account Data</CardTitle>
          <CardDescription>
            Download a machine-readable JSON copy of your profile, workspace memberships, tasks, comments, and chat messages.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-base-100 border border-border">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-base-200 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                <HugeiconsIcon icon={File01Icon} className="size-4.5" strokeWidth={1.8} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Complete Archive (.json)</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Includes all activity, tasks, messages, and comments attributable to your account.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto shrink-0 text-xs"
              disabled={isPending}
              onClick={onExport}
            >
              <HugeiconsIcon icon={Download01Icon} className="size-3.5 mr-1.5" strokeWidth={2} />
              {isPending ? "Generating archive..." : "Download Export"}
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error.message}</p>}
          {success && !isPending && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-xs font-medium border border-success/20">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0" strokeWidth={2} />
              <span>Export generated successfully. Your download has started.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

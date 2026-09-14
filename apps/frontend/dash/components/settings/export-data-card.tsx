"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
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
          <CardTitle>Export your data</CardTitle>
          <CardDescription>
            Download a machine-readable JSON copy of your profile, workspace memberships, tasks, comments, and chat
            messages.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Includes all activity and content attributable to your account across every workspace.
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto shrink-0"
              disabled={isPending}
              onClick={onExport}
            >
              <HugeiconsIcon icon={Download01Icon} className="size-4 mr-1.5" strokeWidth={2} />
              {isPending ? "Generating..." : "Export data"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {success && !isPending && (
            <p className="text-sm text-success">Export generated. Your download has started.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

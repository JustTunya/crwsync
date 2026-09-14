"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserRemove01Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { useCloseAccount } from "@/hooks/use-user";
import { signout } from "@/services/auth.service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { settingsItemVariants } from "@/components/settings/settings-shell";

export function CloseAccountDangerZone() {
  const user = useUser();
  const { mutateAsync, isPending, error, reset } = useCloseAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const onCloseAccount = async () => {
    if (!password) return;
    try {
      await mutateAsync({ userId: user.id, data: { password } });
      await signout();
      window.location.assign(process.env.NEXT_PUBLIC_WEB_URL || "/");
    } catch {
      return;
    }
  };

  return (
    <motion.div variants={settingsItemVariants}>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Close account</CardTitle>
          <CardDescription>
            Permanently de-identify your personal information and leave all workspaces.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-card-foreground">Close your crwsync account</p>
              <p className="text-xs text-muted-foreground">
                Your profile is scrubbed and sessions are revoked. Content you created (tasks, comments) stays
                available to teammates under an anonymized author so shared workspaces aren&apos;t broken.
              </p>
            </div>

            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                  setPassword("");
                  reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-auto shrink-0">
                  <HugeiconsIcon icon={UserRemove01Icon} className="size-4 mr-1.5" strokeWidth={2} />
                  Close account
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close your account?</DialogTitle>
                  <DialogDescription>
                    This will revoke all active sessions, scrub your name, email, and avatar, and remove you from every
                    workspace. Workspaces where you are the only member will be deleted. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="close-account-password">Enter your password to confirm</Label>
                  <Input
                    id="close-account-password"
                    type="password"
                    visible={showPassword}
                    setVisible={() => setShowPassword((v) => !v)}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      reset();
                    }}
                    autoComplete="current-password"
                  />
                  {error && <p className="text-sm text-destructive">{error.message}</p>}
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" className="w-auto" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-auto"
                    disabled={!password || isPending}
                    onClick={onCloseAccount}
                  >
                    {isPending ? "Closing..." : "Close my account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

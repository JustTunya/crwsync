"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, UserRemove01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { useCloseAccount } from "@/hooks/use-user";
import { signout } from "@/services/auth.service";
import { SectionHeader } from "@/components/settings/section-header";
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
    <section id="danger-zone" className="scroll-mt-24">
      <SectionHeader
        icon={Alert02Icon}
        title="Danger Zone"
        description="Irreversible actions regarding your crwsync account and data."
      />

      <motion.div variants={settingsItemVariants}>
        <Card className="border-destructive/40 bg-destructive/5 shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-5 text-destructive shrink-0" strokeWidth={2} />
              <CardTitle className="text-destructive">Close Personal Account</CardTitle>
            </div>
            <CardDescription>
              Permanently de-identify your personal information and leave all workspace memberships.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-background border border-destructive/20">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Permanently close and scrub account</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your profile and credentials are removed, and sessions are immediately revoked. Shared tasks and
                  comments remain available under an anonymized author so team workspaces aren&apos;t broken.
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
                  <Button variant="destructive" size="sm" className="w-auto shrink-0 text-xs">
                    <HugeiconsIcon icon={UserRemove01Icon} className="size-3.5 mr-1.5" strokeWidth={2} />
                    Close account
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                      <HugeiconsIcon icon={Alert02Icon} className="size-5 shrink-0" />
                      Close your account permanently?
                    </DialogTitle>
                    <DialogDescription>
                      This will revoke all active sessions, delete your personal contact details and avatar, and remove you
                      from every workspace. Workspaces where you are the sole member will be removed. This action cannot be
                      undone.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2 py-2">
                    <Label htmlFor="close-account-password">Enter your account password to confirm</Label>
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
                      placeholder="Your current password"
                    />
                    {error && <p className="text-xs text-destructive">{error.message}</p>}
                  </div>

                  <DialogFooter className="gap-2">
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
                      {isPending ? "Closing..." : "Permanently Close Account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

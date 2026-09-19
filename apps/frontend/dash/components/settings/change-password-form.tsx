"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { useChangePassword } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";
import { cn } from "@/lib/utils";

export function ChangePasswordForm() {
  const user = useUser();
  const { mutateAsync, isPending, error, reset } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && isValid && !mismatch && confirmPassword.length > 0;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(false);
    try {
      await mutateAsync({ userId: user.id, data: { currentPassword, newPassword } });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      return;
    }
  };

  return (
    <motion.div variants={settingsItemVariants}>
      <Card>
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account passphrase. Changing your password will sign out all other devices.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                visible={showCurrent}
                setVisible={() => setShowCurrent((v) => !v)}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setSuccess(false);
                  reset();
                }}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                visible={showNew}
                setVisible={() => setShowNew((v) => !v)}
                value={newPassword}
                error={newPassword.length > 0 && !isValid}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setSuccess(false);
                  reset();
                }}
                autoComplete="new-password"
                required
              />

              {newPassword.length > 0 && (
                <div className="p-3 rounded-lg bg-base-100 border border-border mt-2 space-y-1.5 text-xs">
                  <p className="font-medium text-foreground">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                    <div className={cn("flex items-center gap-1.5", hasMinLength && "text-success")}>
                      <HugeiconsIcon
                        icon={hasMinLength ? CheckmarkCircle02Icon : CancelCircleIcon}
                        className="size-3.5"
                      />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", hasUpper && "text-success")}>
                      <HugeiconsIcon icon={hasUpper ? CheckmarkCircle02Icon : CancelCircleIcon} className="size-3.5" />
                      <span>Uppercase letter</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", hasLower && "text-success")}>
                      <HugeiconsIcon icon={hasLower ? CheckmarkCircle02Icon : CancelCircleIcon} className="size-3.5" />
                      <span>Lowercase letter</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", hasNumber && hasSpecial && "text-success")}>
                      <HugeiconsIcon
                        icon={hasNumber && hasSpecial ? CheckmarkCircle02Icon : CancelCircleIcon}
                        className="size-3.5"
                      />
                      <span>Number & special char</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                visible={showConfirm}
                setVisible={() => setShowConfirm((v) => !v)}
                error={mismatch}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setSuccess(false);
                }}
                autoComplete="new-password"
                required
              />
              {mismatch && <p className="text-xs text-destructive">Passwords do not match.</p>}
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}
            {success && !isPending && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm font-medium border border-success/20">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0" strokeWidth={2} />
                <span>Password changed successfully. Other sessions have been signed out.</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="mt-4 justify-end">
            <Button type="submit" size="sm" className="w-auto" disabled={!canSubmit || isPending}>
              {isPending ? "Updating..." : "Update password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/providers/user.provider";
import { useChangePassword } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsItemVariants } from "@/components/settings/settings-shell";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export function ChangePasswordForm() {
  const user = useUser();
  const { mutateAsync, isPending, error, reset } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const weak = newPassword.length > 0 && !PASSWORD_RULE.test(newPassword);
  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && !mismatch && !weak;

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
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing your password signs out every other active session.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 mt-4">
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
                  reset();
                }}
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
                error={weak}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  reset();
                }}
                required
              />
              {weak && (
                <p className="text-sm text-destructive">
                  At least 8 characters, with upper and lower case, a number, and a special character.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                error={mismatch}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {mismatch && <p className="text-sm text-destructive">Passwords do not match.</p>}
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}
            {success && !isPending && (
              <p className="text-sm text-success">Password changed. Other devices have been signed out.</p>
            )}
          </CardContent>

          <CardFooter className="mt-6 justify-end">
            <Button type="submit" size="sm" className="w-auto" disabled={!canSubmit || isPending}>
              {isPending ? "Updating..." : "Update password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

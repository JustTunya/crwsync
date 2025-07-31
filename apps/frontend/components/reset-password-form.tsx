"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResetPasswordState,
  ResetPasswordPayload,
} from "@crwsync/types";
import { resetPassword } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMatch } from "@/hooks/use-match";
import { cn, variants } from "@/lib/utils";
import { GlassBox } from "@/components/ui/glassbox";

const initState: ResetPasswordState = {
  success: false,
  errors: {},
  message: "",
};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confpassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);

  const validPassword = useMatch(password, confpassword);

  const [state, dispatchResetPass, pending] = useActionState(
    resetPassword,
    initState
  );

  const formAction = () => {
    const payload: ResetPasswordPayload = { token, password };
    dispatchResetPass(payload);
  };

  return (
    <GlassBox>
      <div className="text-center space-y-2 mb-8 sm:mb-12">
        <h1 className="text-xl sm:text-2xl font-medium">Reset your password</h1>
        <p className="text-xs sm:text-sm text-balance text-muted-foreground/75">
          Enter a new password for your account.
        </p>
      </div>

      <motion.div
        key="form"
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3 }}
        className="w-full space-y-6"
      >
        <form action={formAction} className="sm:min-w-sm space-y-6">
          <div className="space-y-3">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              visible={showPass}
              setVisible={() => setShowPass(!showPass)}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(validPassword === false && "border-error")}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="confpassword">Confirm Password</Label>
            <Input
              id="confpassword"
              type="password"
              value={confpassword}
              visible={showConfPass}
              setVisible={() => setShowConfPass(!showConfPass)}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(validPassword === false && "border-error")}
            />
            {validPassword === false && (
              <Label error>Passwords do not match or are too short</Label>
            )}
          </div>

          {state.message && (
            <Label
              error={!state.success}
              className={cn(
                "block text-center",
                state.success && "text-success"
              )}
            >
              {state.message}
            </Label>
          )}

          <Button
            type="button"
            onClick={formAction}
            disabled={pending || !validPassword}
            className="w-full"
          >
            {pending ? "Updating password..." : "Update Password"}
          </Button>
        </form>
      </motion.div>
    </GlassBox>
  );
}

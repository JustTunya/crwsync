"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useValidator } from "@/hooks/use-validator";
import { useMatch } from "@/hooks/use-match";
import { StrengthIndicator } from "@/components/ui/strength_indicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GlassBox } from "@/components/ui/glassbox";
import { isPasswordStrong } from "@/lib/validations";
import { variants } from "@/lib/utils";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confpass, setConfPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);

  const validPassword = useValidator(password, isPasswordStrong);
  const matchingPasswords = useMatch(password, confpass);

  const hasPassword = password.length > 0;

  const validForm = useMemo(() => {
    return validPassword?.value === true && matchingPasswords === true;
  }, [validPassword, matchingPasswords]);

  const handleReset = () => {
    // TODO: implement password reset action
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
        <form action={handleReset} className="sm:min-w-sm space-y-6">
          <div className="space-y-3">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              visible={showPass}
              setVisible={() => setShowPass(!showPass)}
              onChange={(e) => setPassword(e.target.value)}
              error={matchingPasswords === false && validPassword?.value === true}
            />
          </div>

          <StrengthIndicator visible={hasPassword} level={validPassword?.meta?.level} />

          <div className="space-y-3">
            <Label htmlFor="confpassword">Confirm Password</Label>
            <Input
              id="confpassword"
              type="password"
              value={confpass}
              visible={showConfPass}
              setVisible={() => setShowConfPass(!showConfPass)}
              onChange={(e) => setConfPass(e.target.value)}
              error={matchingPasswords === false && validPassword?.value === true}
            />
          </div>

          <Button
            type="submit"
            disabled={!validForm}
            className="w-full"
          >
            Update Password
          </Button>
        </form>
      </motion.div>
    </GlassBox>
  );
}

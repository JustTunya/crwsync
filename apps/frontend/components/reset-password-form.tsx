"use client";

import { useMemo, useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
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
import { getResetToken, resetPassword } from "@/services/auth.service";
import { ResetPasswordPayload, ResetPasswordState } from "@crwsync/types";
import { Lead } from "./ui/lead";

const initState: ResetPasswordState = {
  success: false,
  errors: {},
  message: "",
};

export function ResetPasswordForm({ token } : { token: string | null }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confpass, setConfPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "expired" | "error">("pending");

  const [state, dispatch, pending] = useActionState(resetPassword, initState);

  const validPassword = useValidator(password, isPasswordStrong);
  const matchingPasswords = useMatch(password, confpass);

  const hasPassword = password.length > 0;

  const validForm = useMemo(() => {
    return validPassword?.value === true && matchingPasswords === true;
  }, [validPassword, matchingPasswords]);

  const handleReset = () => {
    if (!token) return;
    const payload: ResetPasswordPayload = { token, newPassword: password };
    dispatch(payload);
  };

  useEffect(() => {
    setStatus("pending");

    if (!token) {
      setStatus("error");
      return;
    }

    getResetToken(token).then((resp) => {
      if (!resp) {
        setStatus("error");
        return;
      }

      if (resp.status === "expired") {
        setStatus("expired");
      } else if (resp.status === "used" || resp.status === "revoked") {
        setStatus("error");
      } else {
        setStatus("success");
      }
    });
  }, [token]);

  useEffect(() => {
    if (state.success) {
      router.push("/auth/signin");
    }
  }, [state.success, router]);

  if (status === "success") {
    return (
      <GlassBox>
        <Lead title="Reset your password" description="Enter a new password for your account." />

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
              disabled={!validForm || pending}
              className="w-full"
            >
              Update Password
            </Button>

            {state.message && state.errors && !state.success && (
              <p className="text-sm text-center text-error">
                {state.message}
              </p>
            )}
          </form>
        </motion.div>
      </GlassBox>
    );
  } else {
    return (
      <GlassBox>
        <h1 className="text-xl sm:text-2xl font-medium mb-4">Reset Password</h1>
        {status === "pending" && (
          <p className="text-sm text-foreground/50">Verifying your token...</p>
        )}
        {status === "expired" && (
          <>
            <p className="text-sm text-center text-error">
              It seems like this password reset link has expired. 
              Please request a new one by pressing the button below.
            </p>

            <Button className="mt-4" variant="outline" onClick={() => router.push("/auth/forgot-password")}>Request New Email</Button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-center text-error mb-4">
              The password reset token is invalid or it is not linked to any account. 
              Please check if you entered the link correctly.
            </p>
            <p className="text-sm text-center text-primary/75">
              If you believe this is an error, please contact support at <a className="underline underline-offset-2 text-info" href="mailto:support@crwsync.com">support@crwsync.com</a>
            </p>
          </>
        )}
      </GlassBox>
    );
  }
}

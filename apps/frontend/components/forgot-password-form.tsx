"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { motion } from "framer-motion";
import {
  ForgotPasswordState,
  ForgotPasswordPayload,
} from "@crwsync/types";
import { forgotPassword } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { isEmailValid } from "@/lib/validations";
import { useAvailability } from "@/hooks/use-availability";
import { cn, variants } from "@/lib/utils";
import { GlassBox } from "@/components/ui/glassbox";

const initState: ForgotPasswordState = {
  success: false,
  errors: {},
  message: "",
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const validEmail = useAvailability("email", email, isEmailValid);

  const [state, dispatch, pending] = useActionState(forgotPassword, initState);

  const validForm = !!(validEmail && validEmail.available === false && validEmail.valid === true);

  const handleSubmit = () => {
    const payload: ForgotPasswordPayload = { email };
    dispatch(payload);
  };

  return (
    <GlassBox>
      <div className="text-center space-y-2 mb-8 sm:mb-12">
        <h1 className="text-xl sm:text-2xl font-medium">Forgot your password?</h1>
        <p className="text-xs sm:text-sm text-balance text-muted-foreground/75">
          Enter the email associated with your account and we will send you a link
          to reset your password.
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
        <form action={handleSubmit} className="w-full space-y-6">
          <div className="space-y-3">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                (validEmail?.available === true
                  || validEmail?.valid === false
                  || state.errors?.email
                ) && "border-error"
              )}
            />
            {(validEmail?.available === true) && (
              <Label error>This email address is not linked to any account.</Label>
            )}
            {(validEmail?.valid === false && validEmail?.message) && (
              <Label error>{validEmail.message}</Label>
            )}
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !validForm}
            className="w-full"
          >
            {pending ? "Sending reset link..." : "Send Reset Email"}
          </Button>
        </form>
      </motion.div>

      <p className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
        Remembered your password?{' '}
        <Link
          href="/auth/signin"
          className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none"
        >
          Sign In
        </Link>
      </p>
    </GlassBox>
  );
}
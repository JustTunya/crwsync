"use client";

import Link from "next/link";
import { useState, useEffect, useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
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
import { Lead } from "./ui/lead";

const initState: ForgotPasswordState = {
  success: false,
  errors: {},
  message: "",
};

const emailProviders: Record<string, string> = {
  "gmail.com": "https://mail.google.com",
  "yahoo.com": "https://mail.yahoo.com",
  "outlook.com": "https://outlook.live.com",
  "hotmail.com": "https://outlook.live.com",
  "aol.com": "https://mail.aol.com",
  "icloud.com": "https://www.icloud.com/mail",
  "protonmail.com": "https://mail.proton.me",
  "zoho.com": "https://mail.zoho.com",
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(60);

  const [state, dispatch, pending] = useActionState(forgotPassword, initState);

  const validEmail = useAvailability("email", email, isEmailValid);
  const validForm = !!(validEmail && validEmail.available === false && validEmail.valid === true);

  useEffect(() => {
    if (!state.success || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [state.success, cooldown]);

  const handleSubmit = () => {
    const payload: ForgotPasswordPayload = { email };
    dispatch(payload);
    setCooldown(60);
  };

  const openMailbox = () => {
    if (!email || !email.includes("@")) return;
    const domain = email.split("@")[1];
    const url = emailProviders[domain] || `https://www.${domain}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <GlassBox>
      <AnimatePresence mode="wait">
        {state.success ? (
          <motion.div
            key="success"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full space-y-6"
          >
            <Lead
              title="Check your email"
              description="We sent a password reset link to your email address."
            />

            <p className="text-sm text-center text-muted-foreground font-light">
              Please check &apos;<span className="text-primary font-medium">{email}</span>&apos; and click the link to reset your password.
            </p>

            <Button onClick={openMailbox} variant="outline" type="button" className="w-full">
              <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={2} />
              Open mailbox
            </Button>

            {cooldown > 0 ? (
              <div className="text-center text-xs sm:text-sm text-muted-foreground">
                You can resend the reset link in <span className="font-medium">{cooldown}</span> second{cooldown !== 1 ? "s" : ""}
              </div>
            ) : (
              <div className="text-center text-xs sm:text-sm text-muted-foreground flex flex-row justify-center items-center gap-1">
                Didn&apos;t receive the email?{" "}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={pending}
                  className="rounded-sm text-accent underline underline-offset-2 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/20"
                >
                  Resend
                </button>
              </div>
            )}

            <div className="pt-2 text-center text-xs sm:text-sm text-muted-foreground">
              <Link
                href="/auth/signin"
                className="text-primary underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
                Back to Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full space-y-5"
          >
            <Lead
              title="Forgot your password?"
              description="Enter the email associated with your account and we will send you a link to reset your password."
            />

            <form action={handleSubmit} className="w-full space-y-5">
              {state.message && !state.success && (
                <Label id="forgot-error" error>{state.message}</Label>
              )}
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="email">Email Address</Label>

                {validEmail?.available === true && (
                  <Label id="email-error" error>This email address is not linked to any account.</Label>
                )}
                {validEmail?.valid === false && validEmail?.message && (
                  <Label id="email-error" error>{validEmail.message}</Label>
                )}

                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="johndoe@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={validEmail?.available === true || validEmail?.valid === false || !!state.errors?.email}
                  aria-describedby={
                    validEmail?.available === true || (validEmail?.valid === false && !!validEmail?.message)
                      ? "email-error"
                      : undefined
                  }
                  className={cn(
                    (validEmail?.available === true || validEmail?.valid === false || state.errors?.email) &&
                      "border-error"
                  )}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={pending || !validForm}
                className="w-full"
              >
                {pending ? "Sending reset link..." : "Send Reset Email"}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs sm:text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link
                href="/auth/signin"
                className="text-primary underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassBox>
  );
}
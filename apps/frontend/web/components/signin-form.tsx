"use client";

import Link from "next/link";
import { useState, useEffect, useActionState, startTransition } from "react";
import { motion } from "framer-motion";
import { SigninState, SigninPayload } from "@crwsync/types";
import { signin } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassBox } from "@/components/ui/glassbox";
import { Lead } from "@/components/ui/lead";
import { cn, variants } from "@/lib/utils";

const initState: SigninState = {
  success: false,
  errors: {},
  message: "",
};

export function SigninForm({ next } : { next: string | null }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [state, dispatch, pending] = useActionState(signin, initState);

  const DASH_URL = process.env.NEXT_PUBLIC_DASH_URL!;

  const handleSignin = () => {
    const payload: SigninPayload = { identifier, password, rememberMe };
    startTransition(() => {
      dispatch(payload);
    });
  };

  useEffect(() => {
    if (!state.success) return;

    const dashOrigin = new URL(DASH_URL).origin;
    let target = DASH_URL;

    if (!next) {
      window.location.assign(target);
      return;
    }

    const parser = (value: string) => {
      try {
        return new URL(value);
      } catch {
        return null;
      }
    };

    if (next.startsWith("/")) {
      target = new URL(next, dashOrigin).toString();
    } else {
      const parsed = parser(next);
      if (parsed && parsed.origin === dashOrigin) {
        target = parsed.toString();
      }
    }

    window.location.assign(target);
  }, [state.success, next, DASH_URL]);

  return (
    <GlassBox>
      <Lead title="Welcome back" description="Please enter your credentials to access your account." />

      <motion.div 
        key="signin"
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3 }}
        className="w-full space-y-5"
      >
        <form action={handleSignin} className="w-full space-y-5">
          {(!state.success && state.message) && (
            <Label error>{state.message}</Label>
          )}
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="identifier">Username or Email</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={cn(state.errors?.identifier && "border-error")}
              autoFocus
            />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              visible={showPass}
              setVisible={() => setShowPass(!showPass)}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(state.errors?.password && "border-error")}
            />
          </div>

          <div className="flex justify-between items-center">
            <label htmlFor="remember" className="inline-flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onChange={setRememberMe}
              />
              <Label htmlFor="remember" className="text-xs sm:text-sm">
                Remember Me
              </Label>
            </label>
            <Link href="/auth/forgot-password" className="text-primary text-xs sm:text-sm underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50 focus-visible:outline-none">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={pending || !identifier || !password}
            className="w-full"
          >
            Sign In
          </Button>
        </form>
      </motion.div>

      <p className="mt-5 text-center text-xs sm:text-sm text-muted-foreground">
        Don&apos;t have an account yet?{' '}
        <Link href="/auth/signup" className="text-primary underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50 focus-visible:outline-none">
          Sign Up
        </Link>
      </p>
    </GlassBox>
);
}

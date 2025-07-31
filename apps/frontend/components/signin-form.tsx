"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState, startTransition } from "react";
import { motion } from "framer-motion";
import { SigninState, SigninPayload } from "@crwsync/types";
import { signin } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassBox } from "@/components/ui/glassbox";
import { cn, variants } from "@/lib/utils";

const initState: SigninState = {
  success: false,
  errors: {},
  message: "",
};

export function SigninForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [state, dispatch, pending] = useActionState(signin, initState);

  const handleSignin = () => {
    const payload: SigninPayload = { identifier, password, rememberMe };
    startTransition(() => {
      dispatch(payload);
    });
  };

  return (
    <GlassBox>
      <div className="text-center space-y-2 mb-8 sm:mb-12">
        <h1 className="text-xl sm:text-2xl font-medium">Welcome back</h1>
        <p className="text-xs sm:text-sm text-balance text-muted-foreground/75">
          Please enter your credentials to access your account.
        </p>
      </div>

      <motion.div 
        key="signin"
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3 }}
        className="w-full space-y-6"
      >
        <form action={handleSignin} className="w-full space-y-6">
          <div className="space-y-3">
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

          <div className="space-y-3">
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
            <Link href="/auth/password/forgot" className="text-accent underline underline-offset-2 text-xs sm:text-sm rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
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

      {(!state.success && state.message) && (
        <Label error className="w-full flex justify-center mt-2">{state.message}</Label>
      )}

      <p className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
        Don&apos;t have an account yet?{' '}
        <Link href="/auth/signup" className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
          Sign Up
        </Link>
      </p>
    </GlassBox>
);
}

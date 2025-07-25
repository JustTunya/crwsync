"use client";

import { useState } from "react";
import { useActionState } from "react";
import { SigninState, SigninPayload } from "@crwsync/types";
import { signin } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Checkbox } from "./ui/checkbox";

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

  const [state, dispatchLogin, pending] = useActionState(signin, initState);

  const formAction = () => {
    const payload: SigninPayload = { identifier, password, rememberMe };
    dispatchLogin(payload);
  };

  return (
    <div className="max-w-[calc(100vw-4rem)] mx-auto p-6 sm:p-8 bg-base-200/50 backdrop-blur-md border border-base-100 shadow-xl/5 rounded-2xl">
      <div className="z-[-1] absolute inset-0 rounded-2xl shadow-[inset_0_8px_16px_8px_rgba(255,255,255,0.2),inset_0_-16px_32px_-16px_rgba(0,0,0,0.1)]" />

      <div className="text-center space-y-2 mb-12">
        <h1 className="text-2xl font-medium">Welcome back</h1>
        <p className="text-sm text-muted-foreground/75">
          Please enter your credentials to access your account.
        </p>
      </div>

      <form action={formAction} className="min-w-sm space-y-6">
        <div className="space-y-3">
          <Label htmlFor="identifier">Username or Email</Label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={cn(state.errors?.identifier && "border-error")}
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
            <Label htmlFor="remember" className="text-sm">
              Remember Me
            </Label>
          </label>
          <Link href="/auth/forgot-password" className="text-accent underline underline-offset-2 text-sm rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
            Forgot password?
          </Link>
        </div>

        <Button
          type="button"
          onClick={formAction}
          disabled={pending || !identifier || !password}
          className="w-full"
        >
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account yet?{' '}
        <Link href="/auth/signup" className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
          Sign Up
        </Link>
      </p>
    </div>
);
}

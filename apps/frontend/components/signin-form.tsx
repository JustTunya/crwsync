"use client";

import { useState, useActionState } from "react";
import { SigninState, SigninPayload } from "@crwsync/types";
import { signin } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initState: SigninState = {
  success: false,
  errors: {},
  message: "",
};

export function SigninForm() {
  const [state, dispFormAction, pending] = useActionState(signin, initState);

  const formAction = () => {
    const payload: SigninPayload = {
      identifier: identifier,
      password: password
    };
    console.log("Form submitted:", payload);
    dispFormAction(payload);
  };

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <form action={formAction} className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="identifier">Username or Email address</Label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
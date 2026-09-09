"use client";

import { useEffect, useActionState, startTransition } from "react";
import { SigninState } from "@crwsync/types";
import { signin } from "@/services/auth.service";

const initState: SigninState = { success: false, errors: {}, message: "" };

const DEMO_IDENTIFIER = process.env.NEXT_PUBLIC_DEMO_IDENTIFIER;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

export function TryDemoButton() {
  const [state, dispatch, pending] = useActionState(signin, initState);
  const DASH_URL = process.env.NEXT_PUBLIC_DASH_URL!;

  useEffect(() => {
    if (state.success) window.location.assign(DASH_URL);
  }, [state.success, DASH_URL]);

  const handleClick = () => {
    if (!DEMO_IDENTIFIER || !DEMO_PASSWORD) return;
    startTransition(() => {
      dispatch({ identifier: DEMO_IDENTIFIER, password: DEMO_PASSWORD, rememberMe: false });
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !DEMO_IDENTIFIER || !DEMO_PASSWORD}
        aria-label="Sign in to a shared live demo account, not your own"
        className="group relative bg-primary p-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm text-primary-foreground font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-lg transition-colors" />
        {pending ? "Signing in…" : "Try Live Demo"}
      </button>
      {!state.success && state.message && (
        <span className="text-xs text-error">{state.message}</span>
      )}
    </div>
  );
}

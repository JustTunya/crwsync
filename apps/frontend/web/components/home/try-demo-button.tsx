"use client";

import { useEffect, useActionState, startTransition } from "react";
import { SigninState } from "@crwsync/types";
import { signin } from "@/services/auth.service";
import { cn } from "@/lib/utils";

const initState: SigninState = { success: false, errors: {}, message: "" };

const DEMO_IDENTIFIER = process.env.NEXT_PUBLIC_DEMO_IDENTIFIER;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

export function TryDemoButton({ size = "default" }: { size?: "default" | "lg" }) {
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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !DEMO_IDENTIFIER || !DEMO_PASSWORD}
        className={cn(
          "group relative inline-flex items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground whitespace-nowrap cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          size === "lg" ? "h-11 px-6 text-sm sm:text-base" : "h-9 px-4 text-sm"
        )}
      >
        <span className="absolute inset-0 rounded-lg bg-linear-to-t from-foreground/15 to-transparent transition-colors group-hover:from-foreground/30" />
        <span className="relative">{pending ? "Signing in…" : "Try Live Demo"}</span>
        <span className="sr-only">, signs in to a shared demo account, not your own</span>
      </button>
      {!state.success && state.message && (
        <span role="alert" className="text-xs text-error">{state.message}</span>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Figtree } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { GlassBox } from "@/components/ui/glassbox";
import { Button, buttonVariants } from "@/components/ui/button";
import "@crwsync/styles";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${figtree.variable} font-figtree antialiased`}>
        <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4">
          <GlassBox className="gap-4 text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
              <AlertTriangle className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                An unexpected error occurred while loading the page. Our team has been notified.
              </p>
            </div>
            {error.digest && (
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                Error ref: {error.digest}
              </span>
            )}
            <div className="flex gap-3 pt-2">
              <a href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>Go home</a>
              <Button size="sm" onClick={() => reset()}>Try again</Button>
            </div>
          </GlassBox>
        </div>
      </body>
    </html>
  );
}

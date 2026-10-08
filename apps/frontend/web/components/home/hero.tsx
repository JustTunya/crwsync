import Link from "next/link";
import { TryDemoButton } from "@/components/home/try-demo-button";
import { SyncDemo } from "@/components/home/sync-demo";
import { HeroBackground } from "@/components/home/hero-background";

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b border-border">
      <div className="relative overflow-hidden mx-auto max-w-6xl px-4 sm:px-8 pt-32 sm:pt-40 pb-16 sm:pb-24 lg:border-x lg:border-border">
        <div className="pointer-events-none absolute inset-0">
          <HeroBackground />
        </div>

        <div className="relative max-w-3xl">
          <h1 id="hero-title" className="text-[2.5rem] sm:text-5xl lg:text-[3.75rem] font-bold tracking-[-0.02em] leading-[1.02] text-balance">
            One workspace for the work your team shares.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base sm:text-lg text-muted-foreground leading-normal text-pretty">
            Small teams often run work across a task tracker, a chat app, and a file drive, and lose context moving between them. crwsync puts boards, chat rooms, files, and schedules in one workspace, and every change shows up in every open tab without a refresh.
          </p>
          <div className="w-full mt-8 flex flex-row items-center justify-center sm:justify-start gap-3">
            <TryDemoButton size="lg" />
            <Link
              href="/#early-access"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Join the waitlist
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">The demo uses a shared account with sample data. Nothing to install, nothing to sign up for.</p>
        </div>

        <div className="relative mt-14 sm:mt-20">
          <SyncDemo />
          <p className="mt-3 text-xs text-muted-foreground">
            Simulated replay of the live board. Routes, event names, and cache behavior are the real ones.
          </p>
        </div>
      </div>
    </section>
  );
}

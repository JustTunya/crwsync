import Link from "next/link";
import { TryDemoButton } from "@/components/home/try-demo-button";
import { SyncDemo } from "@/components/home/sync-demo";

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 pt-32 sm:pt-40 pb-16 sm:pb-24 lg:border-x lg:border-border">
        <div className="max-w-3xl">
          <h1 id="hero-title" className="text-[2.5rem] sm:text-5xl lg:text-[3.75rem] font-bold tracking-[-0.02em] leading-[1.02] text-balance">
            Real-time crew collaboration, engineered end to end.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base sm:text-lg text-muted-foreground leading-normal text-pretty">
            crwsync is a complete team workspace: boards, chat, files, and schedules kept in sync across every open tab. Behind it sit a NestJS API, Redis fan-out, BullMQ queues, and Postgres as the source of truth. Built solo as a portfolio system, and every claim on this page runs in the live demo.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <TryDemoButton size="lg" />
            <Link
              href="https://github.com/justtunya/crwsync"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Read the source
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Shared demo account. Nothing to install, nothing to sign up for.</p>
        </div>

        <div className="mt-14 sm:mt-20">
          <SyncDemo />
          <p className="mt-3 text-xs text-muted-foreground">
            Simulated replay of the live board. Routes, event names, and cache behavior are the real ones.
          </p>
        </div>
      </div>
    </section>
  );
}

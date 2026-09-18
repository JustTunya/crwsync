import Link from "next/link";
import { TryDemoButton } from "@/components/home/try-demo-button";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-16 sm:py-24 lg:border-x lg:border-border">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="cta-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] text-balance">
              Open the demo. Move a card. Watch it land in the other tab.
            </h2>
            <p className="mt-4 max-w-[56ch] text-base sm:text-lg text-muted-foreground text-pretty">
              The demo signs you into a shared workspace with seeded boards, rooms, and files. Open it twice to see the sync for yourself.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:justify-end">
            <TryDemoButton size="lg" />
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Create your own workspace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Ripple } from "../ui/ripple";

export default function Hero() {
  return (
    <section className="flex gap-12 px-6 sm:px-12 py-24 items-center justify-center min-h-screen relative">
      <Ripple />
      <div className="max-w-4xl space-y-4 flex flex-col items-center">
        <h1 className="text-balanced text-center text-5xl md:text-6xl text-foreground font-bold tracking-tight leading-tighter">
          Work in sync.{' '}<span className="text-primary">Not in silos.</span>
        </h1>

        <p className="text-balance text-center text-sm sm:text-base lg:text-[1.1rem] text-muted-foreground font-medium tracking-tight leading-tight sm:leading-normal">
          Turn team chaos into shared momentum. crwsync brings your chat, tasks, and schedules into one real-time workspace so your crew never misses a beat.
        </p>

        <Link
          href="/auth/signup"
          prefetch={true}
          className="
            group relative bg-primary p-2 sm:px-3 sm:py-2 mt-4 rounded-lg
            text-xs sm:text-sm text-primary-foreground font-semibold whitespace-nowrap"
        >
          <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-lg transition-colors" />
          Join the crew
        </Link>
      </div>
    </section>
  );
}
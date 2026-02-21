import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function Hero() {
  return (
    <section className="flex flex-col lg:flex-row gap-12 px-12 py-24 md:items-center md:justify-between min-h-screen max-w-7xl mx-auto mt-16 lg:mt-0">
      <div className="max-w-xl space-y-8">
        <h1 className="text-balance text-center lg:text-left text-4xl sm:text-5xl md:text-6xl text-foreground font-bold tracking-tight">
          Teamwork, <br />
          <span className="block text-transparent bg-clip-text bg-linear-to-tr from-primary to-primary/60 dark:bg-primary">
            synchronized and simplified.
          </span>
        </h1>

        <p className="text-balance text-center lg:text-left text-sm lg:text-base text-muted-foreground font-medium">
          One place for your crew to stay organized and in sync, blending tasks,
          schedules, and updates into a simple workspace built for clarity.
        </p>

        <div className="flex justify-center items-center lg:justify-start gap-3 lg:gap-6 w-full">
          <Link
            href="/auth/signup"
            prefetch={true}
            className="
              bg-primary p-2 sm:px-3 sm:py-2 rounded-md
              text-sm sm:text-base text-primary-foreground font-semibold whitespace-nowrap
              hover:bg-primary/90 transition-colors"
          >
            Join Now
          </Link>
          <Link
            href="#overview"
            prefetch={false}
            className="
              inline-flex items-center gap-1 border border-muted-foreground p-2 sm:px-3 sm:py-2 rounded-md
              text-sm sm:text-base text-muted-foreground font-medium whitespace-nowrap
              hover:border-foreground hover:text-foreground transition-colors"
          >
            Learn More
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-5"
            />
          </Link>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md md:mx-0">
        {/* PLACEHOLDER FOR DEMO CARD */}
      </div>
    </section>
  );
}
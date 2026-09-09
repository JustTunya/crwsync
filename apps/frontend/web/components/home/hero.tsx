import Image from "next/image";
import { Ripple } from "@/components/ui/ripple";
import { TryDemoButton } from "@/components/home/try-demo-button";

export default function Hero() {
  return (
    <section className="flex flex-col gap-12 px-6 sm:px-12 py-24 items-center justify-center min-h-screen relative">
      <Ripple />
      <div className="max-w-4xl space-y-4 flex flex-col items-center">
        <h1 className="text-balanced text-center text-5xl md:text-6xl text-foreground font-bold tracking-tight leading-tighter">
          Production-grade, built solo.<br/><span className="text-primary">See how.</span>
        </h1>

        <p className="text-balance text-center text-sm sm:text-base lg:text-[1.1rem] text-muted-foreground font-medium tracking-tight leading-tight sm:leading-normal">
          crwsync is a fictional real-time collaboration platform, engineered end to end — public portal, authenticated dashboard, and a horizontally scalable backend — to prove out full-stack and infrastructure ability.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
          <TryDemoButton />
        </div>
      </div>

      <div
        className="group relative w-full max-w-4xl rounded-2xl overflow-hidden border-[1.5px] border-foreground/10 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 backdrop-blur-md backdrop-saturate-100 shadow-xl/5"
        aria-hidden
      >
        <div className="flex items-center gap-1.5 px-4 h-9 border-b-[1.5px] border-foreground/10">
          <span className="size-2 rounded-full bg-foreground/15" />
          <span className="size-2 rounded-full bg-foreground/15" />
          <span className="size-2 rounded-full bg-foreground/15" />
        </div>

        <div className="relative w-full aspect-video">
          <Image
            src="/demo/poster.png"
            alt="crwsync product walkthrough — coming soon"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-radial from-black/40 via-transparent to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center size-16 bg-background/80 border-[1.5px] border-foreground/10 backdrop-blur-sm rounded-full shadow-lg shadow-black/30 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="size-6 fill-primary translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

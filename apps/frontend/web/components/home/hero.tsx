"use client";

import Image from "next/image";
import { useRef } from "react";
import { Ripple } from "@/components/ui/ripple";
import { TryDemoButton } from "@/components/home/try-demo-button";
import { DemoVideoDialog } from "@/components/home/demo-video-dialog";

export default function Hero() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openDemo = () => dialogRef.current?.showModal();

  return (
    <section className="flex flex-col gap-12 px-6 sm:px-12 py-24 items-center justify-center min-h-screen relative">
      <Ripple />
      <div className="max-w-4xl space-y-4 flex flex-col items-center">
        <h1 className="text-balanced text-center text-5xl md:text-6xl text-foreground font-bold tracking-tight leading-tighter">
          Production-grade, built solo.{' '}<span className="text-primary">See how.</span>
        </h1>

        <p className="text-balance text-center text-sm sm:text-base lg:text-[1.1rem] text-muted-foreground font-medium tracking-tight leading-tight sm:leading-normal">
          crwsync is a fictional real-time collaboration platform, engineered end to end — public portal, authenticated dashboard, and a horizontally scalable backend — to prove out full-stack and infrastructure ability.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
          <TryDemoButton />
          <button
            type="button"
            onClick={openDemo}
            className="px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground border-[1.5px] border-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer"
          >
            Watch the walkthrough
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openDemo}
        aria-label="Watch the 86-second product walkthrough"
        className="group relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border-[1.5px] border-foreground/10 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 backdrop-blur-md backdrop-saturate-100 shadow-xl/5 cursor-pointer"
      >
        <Image
          src="/demo/poster.jpg"
          alt="crwsync product walkthrough preview"
          fill
          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center justify-center size-16 bg-primary rounded-full shadow-lg shadow-black/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="size-6 fill-primary-foreground translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>

      <DemoVideoDialog ref={dialogRef} />
    </section>
  );
}

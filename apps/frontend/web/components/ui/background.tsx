"use client";

import { useEffect, useState } from "react";

const BACKGROUND_RENDER_DELAY = 100;

export default function Background() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), BACKGROUND_RENDER_DELAY);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div aria-hidden="true" className="fixed top-0 -z-10 size-full bg-base-100 overflow-hidden">
      {mounted && (
        <>
          <div
            className="absolute inset-0 z-0 opacity-15"
            style={{
              backgroundImage: `
                linear-gradient(to right, var(--muted-foreground) 1px, transparent 1px),
                linear-gradient(to bottom, var(--muted-foreground) 1px, transparent 1px)
              `,
              backgroundSize: "3rem 3rem",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 60%)",
              maskImage:
                "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 60%)",
            }}
          />
          <div aria-hidden="true" className="fixed top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
            <div 
              style={{
                clipPath: "polygon(74.1% 44.1%, 90% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)", 
                transform: "scale(0.75)",
                willChange: "transform"
              }}
              className="aspect-video w-screen bg-linear-to-tl from-primary to-secondary opacity-50"
            />
            <div 
              style={{
                clipPath: "polygon(74.1% 44.1%, 90% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)", 
                transform: "scale(1.50) rotate(180deg) translateY(5%)",
                willChange: "transform"
              }}
              className="absolute inset-0 aspect-video w-screen bg-linear-to-tl from-primary to-secondary opacity-10"
            />
            <div 
              style={{
                clipPath: "polygon(74.1% 44.1%, 90% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)", 
                transform: "scale(1.50) rotate(90deg) translateY(-50%)",
                willChange: "transform"
              }}
              className="absolute inset-0 aspect-video w-screen bg-linear-to-tl from-primary to-secondary opacity-5"
            />
          </div>
        </>
      )}
    </div>
  );
}
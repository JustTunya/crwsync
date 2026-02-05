"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { NavMenu } from "@/components/home/nav-menu";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const MobileMenu = dynamic(() => import("@/components/home/mobile-menu"), {
  loading: () => null,
  ssr: false,
});

export default function Header() {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setTimeout(() => setOpen(false), 0);
    }
  }, [isMobile]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 z-40 flex flex-col items-start gap-12 m-4 px-4 sm:px-8 py-4 bg-background/15 dark:bg-foreground/5 border-[0.5px] border-background dark:border-foreground/10 backdrop-saturate-100 inset-shadow-sm inset-shadow-background dark:inset-shadow-foreground/10 shadow-lg shadow-black/5 rounded-xl",
          open ? "backdrop-blur-xl h-[calc(100vh-2rem)]" : "backdrop-blur-sm h-18",
          "transition-[height, backdrop-filter] duration-500 ease-in-out"
        )}
      >
        <div className="pointer-events-none absolute inset-0 w-full h-1/2 bg-linear-to-b from-background dark:from-foreground/10 to-transparent rounded-t-xl" />

        <div className="w-full flex items-center justify-between">
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="inline-block z-10">
              {isMobile ? (
                <Image
                  src="/icon@orange.svg"
                  alt="crwsync"
                  width={28}
                  height={28}
                  className="size-7"
                  priority
                  quality={90}
                />
              ) : (
                <Image
                  src="/logo@orange.svg"
                  alt="crwsync"
                  width={162}
                  height={24}
                  className="h-6 w-min"
                  priority
                  quality={90}
                />
              )}
            </Link>
          </div>

          <NavMenu />

          <div className="flex items-center gap-2 sm:gap-6 z-10">
            <Link
              href="/auth/signin"
              className="
                p-2 sm:px-3 sm:py-1 rounded-md
                text-sm sm:text-base text-muted-foreground font-medium foregroundspace-nowrap
                hover:text-primary hover:bg-primary/15 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="
                bg-primary p-2 sm:px-3 sm:py-2 rounded-md
                text-sm sm:text-base text-primary-foreground font-semibold foregroundspace-nowrap
                hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            {isMobile && (
              open ? (
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className="size-5 ml-2 text-muted-foreground hover:text-primary transition-colors"
                />
              ) : (
                <HugeiconsIcon
                  icon={Menu01Icon}
                  strokeWidth={2}
                  onClick={() => {
                    setOpen(true);
                  }}
                  className="size-5 ml-2 text-muted-foreground hover:text-primary transition-colors"
                />
              )
            )}
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {isMobile && open && <MobileMenu key="mobile-menu" setOpen={setOpen} />}
        </AnimatePresence>
      </header>
    </>
  );
}
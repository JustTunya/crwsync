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

// Dynamically import MobileMenu to reduce initial bundle size
const MobileMenu = dynamic(() => import("@/components/home/mobile-menu"), {
  loading: () => null,
  ssr: false,
});

export default function Header() {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

  return (
    <>
      <header className={cn(
        "fixed inset-x-0 z-40 flex flex-col items-start gap-12 m-4 px-4 sm:px-8 py-4 bg-background/50 border-[2px] border-background backdrop-saturate-100 inset-shadow-sm inset-shadow-background shadow-xl shadow-background/30 rounded-xl",
        open ? "backdrop-blur-md h-[calc(100vh-2rem)]" : "backdrop-blur-sm h-18", "transition-[height, backdrop-filter] duration-500 ease-in-out"
      )}>
        <div className="pointer-events-none absolute left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-background/50 to-background/0 rounded-xl" />
        
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="inline-block z-10">
              {isMobile ? (
                // Icon: 28x28px matches Tailwind's size-7 (1.75rem = 28px)
                <Image src="/icon@orange.svg" alt="crwsync" width={28} height={28} className="size-7" priority quality={90} />
              ) : (
                // Logo: Proportionally sized for 24px height, matches Tailwind's h-6 (1.5rem = 24px)
                <Image src="/logo@orange.svg" alt="crwsync" width={162} height={24} className="h-6 w-min" priority quality={90} />
              )}
            </Link>
          </div>

          <NavMenu />

          <div className="flex items-center gap-2 sm:gap-6 z-10">
            <Link
              href="/auth/signin"
              prefetch={true}
              className="
                p-2 sm:px-3 sm:py-1 rounded-md
                text-sm sm:text-base text-muted-foreground font-medium whitespace-nowrap
                hover:text-primary hover:bg-primary/15 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              prefetch={true}
              className="
                bg-primary p-2 sm:px-3 sm:py-2 rounded-md
                text-sm sm:text-base text-primary-foreground font-semibold whitespace-nowrap
                hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            {isMobile && (
              open ? (
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} onClick={() => {setOpen(false)}} className="size-5 ml-2 text-muted-foreground hover:text-primary transition-colors" />
              ) : (
                <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} onClick={() => {setOpen(true)}} className="size-5 ml-2 text-muted-foreground hover:text-primary transition-colors" />
              )
            )}
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {isMobile && open && (
            <MobileMenu key="mobile-menu" open={open} setOpen={setOpen} />
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
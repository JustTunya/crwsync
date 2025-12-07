"use client";

import Link from "next/link";
import Image from "next/image";
import { NavMenu } from "./nav-menu";
import { useMobile } from "@/hooks/use-mobile";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";

export default function Header() {
  const isMobile = useMobile();

  return (
    <>
      <header className="fixed inset-x-0 top-0 flex items-center justify-between m-4 px-4 sm:px-8 py-4 bg-background/50 border-[2px] border-background backdrop-blur-sm backdrop-saturate-100 inset-shadow-sm inset-shadow-background shadow-xl shadow-background/30 rounded-xl">
        <div className="absolute left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-background/50 to-background/0 rounded-xl" />
        
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="inline-block z-10">
            {isMobile ? (
              <Image src="/icon@orange.svg" alt="crwsync" width={512} height={512} className="size-7" priority />
            ) : (
              <Image src="/logo@orange.svg" alt="crwsync" width={3250} height={512} className="h-6 w-min" priority />
            )}
          </Link>

          {/* <div className="flex items-center justify-center gap-1 bg-primary/15 text-primary text-xs font-semibold px-2 py-1 rounded-full select-none">
            <div className="size-2 bg-primary rounded-full animate-pulse"/>
            BETA
          </div> */}
        </div>

        <NavMenu />

        <div className="flex items-center gap-2 sm:gap-6 z-10">
          <Link
            href="/auth/signin"
            className="
              p-2 sm:px-3 sm:py-1 rounded-md
              text-sm sm:text-base text-muted-foreground font-medium whitespace-nowrap
              hover:text-primary hover:bg-primary/15 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="
              bg-primary p-2 sm:px-3 sm:py-2 rounded-md
              text-sm sm:text-base text-primary-foreground font-semibold whitespace-nowrap
              hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          {isMobile && (<HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-5 ml-2 text-muted-foreground hover:text-primary transition-colors" />)}
        </div>
      </header>
    </>
  );
}
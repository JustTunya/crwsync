"use client";

import Link from "next/link";
import Image from "next/image";
import { useMobile } from "@/hooks/use-mobile";

export function AuthHeader() {
  const isMobile = useMobile();

  return (
    <header
      role="banner"
      className="fixed inset-x-0 top-0 z-50 flex items-center min-h-10 sm:min-h-11 w-[calc(100vw-2rem)] m-4 px-3 py-2 bg-background/70 dark:bg-background/60 border border-border backdrop-blur-md backdrop-saturate-100 shadow-lg shadow-black/5 rounded-xl"
    >
      <Link href="/" className="inline-flex items-center gap-4 ml-1 z-10 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        {isMobile ? (
          <Image src="/icon@orange.svg" alt="crwsync" width={28} height={28} className="size-5" priority quality={90} />
        ) : (
          <Image src="/logo@orange.svg" alt="crwsync" width={162} height={24} className="h-5 w-min" priority quality={90} />
        )}
      </Link>
    </header>
  );
}

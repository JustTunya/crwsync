import Image from "next/image";
import Link from "next/link";
import { NavMenu } from "./nav-menu";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 flex items-center justify-between m-4 px-4 sm:px-8 py-4 bg-background/50 border-[2px] border-background backdrop-blur-md inset-shadow-sm inset-shadow-background shadow-xl shadow-background/15 rounded-xl">
      <div className="absolute left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-background/50 to-background/0 rounded-xl" />
      
      <div className="flex items-center justify-center gap-4">
        <Link href="/" className="inline-block z-10">
          <Image src="/logo@orange.svg" alt="crwsync" width={3250} height={512} className="h-5 md:h-6 w-min sm:w-auto" priority />
        </Link>

        <div className="flex items-center justify-center gap-1 bg-primary/15 text-primary text-xs font-semibold px-2 py-1 rounded-full select-none">
          <div className="size-2 bg-primary rounded-full animate-pulse"/>
          BETA
        </div>
      </div>

      <NavMenu />

      <div className="flex items-center gap-3 sm:gap-6 z-10">
        <Link
          href="/auth/signin"
          className="px-3 py-1 text-sm sm:text-base text-muted-foreground whitespace-nowrap rounded-md hover:text-primary hover:bg-primary/15 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="bg-primary text-sm sm:text-base text-primary-foreground font-semibold px-2 py-1 sm:px-3 sm:py-2 rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
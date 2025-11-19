import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4">
      <div className="flex items-center gap-16">
        <Link href="/" className="inline-block">
          <Image src="/logo@orange.svg" alt="crwsync" width={3250} height={512} className="h-5 md:h-6 w-min sm:w-auto" priority />
        </Link>
        <nav className="hidden lg:flex items-center gap-6 text-muted-foreground">
          <Link href="#" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#" className="hover:text-primary transition-colors">Use Cases</Link>
          <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
          <Link href="#" className="hover:text-primary transition-colors">Docs</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4 sm:gap-8">
        <Link
          href="/auth/signin"
          className="text-muted-foreground whitespace-nowrap hover:text-primary transition-colors text-sm sm:text-base"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="bg-primary text-sm sm:text-base text-primary-foreground font-semibold px-2 py-1 sm:px-4 sm:py-2 rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
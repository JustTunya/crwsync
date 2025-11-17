import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-16">
        <Link href="/" className="inline-block">
          <Image src="/logo@orange.svg" alt="crwsync" width={3250} height={512} className="h-6 sm:w-auto" priority />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-muted-foreground">
          <Link href="#" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#" className="hover:text-primary transition-colors">Use Cases</Link>
          <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
          <Link href="#" className="hover:text-primary transition-colors">Docs</Link>
        </nav>
      </div>

      <div className="flex items-center gap-8">
        <Link
          href="/auth/signin"
          className="text-muted-foreground whitespace-nowrap hover:text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="bg-primary text-sm text-primary-foreground font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
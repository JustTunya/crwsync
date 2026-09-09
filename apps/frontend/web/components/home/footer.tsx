import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="grid grid-cols-1 md:grid-cols-2 items-center sm:justify-between gap-x-32 gap-y-16 bg-foreground dark:bg-background border-t border-base-300 px-8 sm:px-24 lg:px-32 py-16">
      <div className="flex flex-col items-center gap-2">
        <Link href="/">
          <Image src="/logo@white.svg" alt="crwsync" width={3250} height={512} className="h-7 xl:h-8 md:w-auto" priority />
        </Link>

        <p className="text-xs text-foreground font-light">© 2026 Tunya Lénárd-Sándor. All rights reserved.</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Link href="https://github.com/justtunya/crwsync" aria-label="GitHub">
          <div
            className="size-6 bg-current" 
            style={{ 
              WebkitMaskImage: "url(/github.svg)", 
              maskImage: "url(/github.svg)", 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        </Link>

        <Link href="https://www.linkedin.com/in/lenard-tunya/" aria-label="LinkedIn">
          <div
            className="size-8 bg-current" 
            style={{ 
              WebkitMaskImage: "url(/linkedin.svg)", 
              maskImage: "url(/linkedin.svg)", 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        </Link>
      </div>
    </footer>
  );
}

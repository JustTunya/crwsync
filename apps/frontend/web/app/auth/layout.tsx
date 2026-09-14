import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full">
      <Link
        href="/"
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground bg-background/40 dark:bg-foreground/5 hover:bg-background/60 dark:hover:bg-foreground/10 border border-foreground/10 hover:border-foreground/20 backdrop-blur-md shadow-sm shadow-black/5 rounded-full transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        aria-label="Back to home"
      >
        <HugeiconsIcon
          icon={ArrowLeft01Icon}
          size={16}
          strokeWidth={2}
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        <span>Back to home</span>
      </Link>
      {children}
    </div>
  );
}

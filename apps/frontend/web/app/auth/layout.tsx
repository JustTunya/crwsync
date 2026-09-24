import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth-header";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[140px]" />

      <AuthHeader />

      <main className="relative z-10 flex-1 flex items-center justify-center mx-auto w-full max-w-6xl px-4 pt-28 pb-12 sm:pt-32 lg:border-x lg:border-border">
        {children}
      </main>

      <footer role="contentinfo" className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground/60 select-none lg:border-x lg:border-border">
          crwsync &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

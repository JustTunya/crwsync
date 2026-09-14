import Link from "next/link";
import Header from "@/components/home/header";
import Footer from "@/components/home/footer";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ eyebrow, title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col items-center px-6 sm:px-12 pt-28 sm:pt-36 pb-20">
        <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
          <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            {eyebrow}
          </span>
        </div>

        <div className="w-full max-w-2xl mt-6 space-y-10">
          <div className="text-center space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
          </div>

          <div className="p-6 sm:p-8 bg-linear-to-br from-foreground/8 via-foreground/5 to-foreground/4 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-xl">
            <p className="text-sm text-muted-foreground leading-relaxed">
              crwsync is a solo-built portfolio project demonstrating a production-shaped SaaS architecture — not a
              company with live customers. This document is written the way a real product&apos;s would be, so you
              can judge that engineering discipline for yourself, but no real personal data is processed outside of
              what you enter into this demo. Questions go to{" "}
              <a href="mailto:support@crwsync.xyz" className="text-accent underline underline-offset-2">
                support@crwsync.xyz
              </a>
              .
            </p>
          </div>

          <div className="space-y-8 text-foreground/90">{children}</div>

          <div className="text-center pt-4">
            <Link href="/" className="text-sm font-medium text-accent underline underline-offset-2">
              Back to crwsync
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

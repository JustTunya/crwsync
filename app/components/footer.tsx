"use client";

import { Github, ExternalLink, Zap } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative py-12 px-6 border-t border-border">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-gradient-radial from-primary/5 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and copyright */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 rounded-md blur-sm group-hover:bg-primary/30 transition-colors" />
                <Zap className="w-4 h-4 text-primary relative z-10" />
              </div>
              <span className="text-lg font-semibold tracking-tight">
                crwsync
              </span>
            </Link>
            <p className="text-xs text-muted-foreground text-center md:text-left max-w-sm">
              Developed by{" "}
              <span className="text-foreground">Tunya Lénárd-Sándor</span>.
              <br />
              Proprietary Evaluation License.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all"
              aria-label="View on GitHub"
            >
              <Github className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all"
              aria-label="Visit portfolio"
            >
              <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} crwsync. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="ml-1">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

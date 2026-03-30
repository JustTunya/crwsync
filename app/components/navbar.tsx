"use client";

import { useState, useEffect } from "react";
import { Github, Zap } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
              <Zap className="w-5 h-5 text-primary relative z-10" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              crwsync
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Features
            </Link>
            <Link
              href="#architecture"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Architecture
            </Link>
            <Link
              href="#stack"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Stack
            </Link>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-all"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">View GitHub</span>
            </Link>
            <Link
              href="#"
              className="relative px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all group overflow-hidden"
            >
              <span className="relative z-10">Open Workspace</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-orange-400 to-primary bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  UserIcon,
  PaintBoardIcon,
  Notification02Icon,
  ShieldIcon,
  LockKeyIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

interface SectionNav {
  id: string;
  label: string;
  icon: HugeiconsIconProps["icon"];
  isDanger?: boolean;
}

const SECTIONS: SectionNav[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "appearance", label: "Appearance", icon: PaintBoardIcon },
  { id: "notifications", label: "Notifications", icon: Notification02Icon },
  { id: "security", label: "Security", icon: ShieldIcon },
  { id: "privacy", label: "Data & Privacy", icon: LockKeyIcon },
  { id: "danger-zone", label: "Danger Zone", icon: Alert02Icon, isDanger: true },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const settingsItemVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(3px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 350, damping: 30 },
  },
};

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [activeSection, setActiveSection] = useState<string>("profile");
  const isScrollingRef = useRef(false);

  useEffect(() => {
    // Handle initial hash navigation
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
          setActiveSection(targetId);
        }, 100);
      }
    }

    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (isScrollingRef.current) return;
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) {
        setActiveSection(visible.target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    });

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    isScrollingRef.current = true;
    setActiveSection(id);
    el.scrollIntoView({ behavior: "smooth" });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 px-4 sm:px-8 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href="/"
            className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" strokeWidth={2} />
            <span className="sr-only">Back to dashboard</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Account Settings</h1>
            <p className="text-xs text-muted-foreground leading-4 hidden sm:block truncate">
              Manage your personal profile, appearance, notifications, security, and data preferences
            </p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 shrink-0 px-2.5 py-1 rounded-full bg-base-100 border border-border">
            <UserAvatar user={user} size={6} />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-tight">
                {user.firstname} {user.lastname}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">@{user.username}</span>
            </div>
          </div>
        )}
      </header>

      <nav
        aria-label="Settings navigation"
        className="sticky top-16 z-20 flex items-center gap-1.5 px-4 sm:px-8 h-12 border-b border-border bg-background/90 backdrop-blur-md overflow-x-auto no-scrollbar"
      >
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 border",
                isActive
                  ? section.isDanger
                    ? "bg-destructive/10 text-destructive border-destructive/30 shadow-xs"
                    : "bg-primary/10 text-primary border-primary/25 shadow-xs font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              <HugeiconsIcon icon={section.icon} className="size-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
              {section.label}
            </button>
          );
        })}
      </nav>

      <motion.main
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl mx-auto space-y-12 pb-24">{children}</div>
      </motion.main>
    </div>
  );
}

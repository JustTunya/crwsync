"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, UserIcon, ShieldIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Profile", icon: UserIcon },
  { href: "/settings/security", label: "Security", icon: ShieldIcon },
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export const settingsItemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 350, damping: 30 },
  },
};

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full min-h-screen">
      <header className="flex items-center gap-4 h-16 px-4 sm:px-8 border-b border-base-200">
        <Link
          href="/"
          className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" strokeWidth={2} />
          <span className="sr-only">Back to dashboard</span>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground leading-4">Manage your profile and security</p>
        </div>
      </header>

      <nav className="flex items-center gap-1 px-4 sm:px-8 h-12 border-b border-base-200">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <HugeiconsIcon icon={tab.icon} className="size-4" strokeWidth={2} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <motion.div
        className="flex-1 overflow-y-auto p-4 sm:p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-2xl mx-auto space-y-6">{children}</div>
      </motion.div>
    </div>
  );
}

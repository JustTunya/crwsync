"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <div
        className={cn(
          "size-8 sm:size-9 rounded-full bg-foreground/5 border border-foreground/10",
          className
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center size-8 sm:size-9 rounded-full cursor-pointer",
        "bg-background/40 dark:bg-foreground/5 hover:bg-background/80 dark:hover:bg-foreground/10",
        "border border-foreground/10 hover:border-foreground/20 backdrop-blur-md shadow-sm shadow-black/5",
        "text-muted-foreground hover:text-foreground transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <HugeiconsIcon
        icon={isDark ? Sun01Icon : Moon02Icon}
        size={16}
        strokeWidth={2}
        className="size-4 transition-transform duration-200 hover:rotate-12"
      />
    </button>
  );
}

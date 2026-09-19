"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PaintBoardIcon,
  Sun01Icon,
  Moon02Icon,
  LaptopIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
  CheckmarkCircle02Icon,
  ActivityIcon,
} from "@hugeicons/core-free-icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/settings/section-header";
import { settingsItemVariants } from "@/components/settings/settings-shell";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  playNotificationSound,
} from "@/lib/notification-sound";
import { cn } from "@/lib/utils";

const LIGHT_TOKENS = {
  background: "oklch(1.00 0.007 64.35)",
  foreground: "oklch(0.16 0.020 64.35)",
  card: "oklch(0.98 0.008 64.35)",
  border: "oklch(0.87 0.015 64.35)",
  base100: "oklch(0.940 0.0035 64.35)",
  base200: "oklch(0.880 0.0035 64.35)",
  base300: "oklch(0.820 0.0035 64.35)",
  primary: "oklch(0.703 0.188 36.91)",
};

const DARK_TOKENS = {
  background: "oklch(0.15 0.015 64.35)",
  foreground: "oklch(0.98 0.008 64.35)",
  card: "oklch(0.18 0.015 64.35)",
  border: "oklch(0.24 0.015 64.35)",
  base100: "oklch(0.21 0.015 64.35)",
  base200: "oklch(0.27 0.015 64.35)",
  base300: "oklch(0.33 0.015 64.35)",
  primary: "oklch(0.703 0.188 36.91)",
};

function LightThemePreview() {
  return (
    <div
      className="h-20 w-full rounded-lg p-2 mb-3 flex flex-col justify-between overflow-hidden shadow-xs border"
      style={{
        backgroundColor: LIGHT_TOKENS.background,
        borderColor: LIGHT_TOKENS.border,
      }}
    >
      <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: LIGHT_TOKENS.border }}>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full" style={{ backgroundColor: LIGHT_TOKENS.primary }} />
          <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: LIGHT_TOKENS.base300 }} />
        </div>
        <div className="h-1.5 w-4 rounded-full" style={{ backgroundColor: LIGHT_TOKENS.base200 }} />
      </div>
      <div className="flex gap-1.5 flex-1 pt-1.5">
        <div className="w-5 rounded flex flex-col gap-1 p-0.5" style={{ backgroundColor: LIGHT_TOKENS.base100 }}>
          <div className="h-1 rounded" style={{ backgroundColor: LIGHT_TOKENS.primary }} />
          <div className="h-1 rounded" style={{ backgroundColor: LIGHT_TOKENS.base300 }} />
          <div className="h-1 rounded" style={{ backgroundColor: LIGHT_TOKENS.base300 }} />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1">
          <div
            className="rounded p-1 flex flex-col justify-between border"
            style={{ backgroundColor: LIGHT_TOKENS.card, borderColor: LIGHT_TOKENS.border }}
          >
            <div className="h-1 w-6 rounded" style={{ backgroundColor: LIGHT_TOKENS.foreground, opacity: 0.8 }} />
            <div className="h-2 rounded" style={{ backgroundColor: LIGHT_TOKENS.primary, opacity: 0.2 }} />
          </div>
          <div
            className="rounded p-1 flex flex-col justify-between border"
            style={{ backgroundColor: LIGHT_TOKENS.card, borderColor: LIGHT_TOKENS.border }}
          >
            <div className="h-1 w-5 rounded" style={{ backgroundColor: LIGHT_TOKENS.foreground, opacity: 0.8 }} />
            <div className="h-2 rounded" style={{ backgroundColor: LIGHT_TOKENS.base200 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkThemePreview() {
  return (
    <div
      className="h-20 w-full rounded-lg p-2 mb-3 flex flex-col justify-between overflow-hidden shadow-xs border"
      style={{
        backgroundColor: DARK_TOKENS.background,
        borderColor: DARK_TOKENS.border,
      }}
    >
      <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: DARK_TOKENS.border }}>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full" style={{ backgroundColor: DARK_TOKENS.primary }} />
          <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: DARK_TOKENS.base300 }} />
        </div>
        <div className="h-1.5 w-4 rounded-full" style={{ backgroundColor: DARK_TOKENS.base200 }} />
      </div>
      <div className="flex gap-1.5 flex-1 pt-1.5">
        <div className="w-5 rounded flex flex-col gap-1 p-0.5" style={{ backgroundColor: DARK_TOKENS.base100 }}>
          <div className="h-1 rounded" style={{ backgroundColor: DARK_TOKENS.primary }} />
          <div className="h-1 rounded" style={{ backgroundColor: DARK_TOKENS.base300 }} />
          <div className="h-1 rounded" style={{ backgroundColor: DARK_TOKENS.base300 }} />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1">
          <div
            className="rounded p-1 flex flex-col justify-between border"
            style={{ backgroundColor: DARK_TOKENS.card, borderColor: DARK_TOKENS.border }}
          >
            <div className="h-1 w-6 rounded" style={{ backgroundColor: DARK_TOKENS.foreground, opacity: 0.8 }} />
            <div className="h-2 rounded" style={{ backgroundColor: DARK_TOKENS.primary, opacity: 0.25 }} />
          </div>
          <div
            className="rounded p-1 flex flex-col justify-between border"
            style={{ backgroundColor: DARK_TOKENS.card, borderColor: DARK_TOKENS.border }}
          >
            <div className="h-1 w-5 rounded" style={{ backgroundColor: DARK_TOKENS.foreground, opacity: 0.8 }} />
            <div className="h-2 rounded" style={{ backgroundColor: DARK_TOKENS.base200 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemThemePreview() {
  return (
    <div className="h-20 w-full rounded-lg mb-3 flex overflow-hidden shadow-xs border border-border">
      <div
        className="w-1/2 h-full p-2 flex flex-col justify-between border-r"
        style={{
          backgroundColor: LIGHT_TOKENS.background,
          borderColor: LIGHT_TOKENS.border,
        }}
      >
        <div className="flex items-center gap-1 pb-1">
          <div className="size-2 rounded-full" style={{ backgroundColor: LIGHT_TOKENS.primary }} />
          <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: LIGHT_TOKENS.base300 }} />
        </div>
        <div
          className="rounded p-1 border flex-1 flex flex-col justify-between"
          style={{ backgroundColor: LIGHT_TOKENS.card, borderColor: LIGHT_TOKENS.border }}
        >
          <div className="h-1 w-4 rounded" style={{ backgroundColor: LIGHT_TOKENS.foreground, opacity: 0.8 }} />
          <div className="h-2 rounded" style={{ backgroundColor: LIGHT_TOKENS.primary, opacity: 0.2 }} />
        </div>
      </div>

      <div
        className="w-1/2 h-full p-2 flex flex-col justify-between"
        style={{
          backgroundColor: DARK_TOKENS.background,
        }}
      >
        <div className="flex items-center gap-1 pb-1 justify-end">
          <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: DARK_TOKENS.base300 }} />
          <div className="size-2 rounded-full" style={{ backgroundColor: DARK_TOKENS.primary }} />
        </div>
        <div
          className="rounded p-1 border flex-1 flex flex-col justify-between"
          style={{ backgroundColor: DARK_TOKENS.card, borderColor: DARK_TOKENS.border }}
        >
          <div className="h-1 w-4 rounded" style={{ backgroundColor: DARK_TOKENS.foreground, opacity: 0.8 }} />
          <div className="h-2 rounded" style={{ backgroundColor: DARK_TOKENS.base200 }} />
        </div>
      </div>
    </div>
  );
}

const THEME_OPTIONS = [
  {
    id: "light",
    label: "Light",
    description: "Warm paper canvas with crisp ember accents",
    icon: Sun01Icon,
    renderPreview: () => <LightThemePreview />,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Warm control room with deep charcoal panels",
    icon: Moon02Icon,
    renderPreview: () => <DarkThemePreview />,
  },
  {
    id: "system",
    label: "System",
    description: "Automatically matches your device preference",
    icon: LaptopIcon,
    renderPreview: () => <SystemThemePreview />,
  },
] as const;

const emptySubscribe = (callback: () => void) => {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }
  return () => {};
};

const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const getSoundSnapshot = () => isNotificationSoundEnabled();
const getSoundServerSnapshot = () => true;

const getMotionSnapshot = () =>
  typeof window !== "undefined" ? localStorage.getItem("crwsync-reduced-motion") === "true" : false;
const getMotionServerSnapshot = () => false;

export function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const soundEnabled = useSyncExternalStore(emptySubscribe, getSoundSnapshot, getSoundServerSnapshot);
  const reducedMotion = useSyncExternalStore(emptySubscribe, getMotionSnapshot, getMotionServerSnapshot);

  const [, setTick] = useState(0);

  const handleSoundToggle = (enabled: boolean) => {
    setNotificationSoundEnabled(enabled);
    setTick((t) => t + 1);
  };

  const handleMotionToggle = (enabled: boolean) => {
    localStorage.setItem("crwsync-reduced-motion", enabled ? "true" : "false");
    if (enabled) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
    setTick((t) => t + 1);
  };

  return (
    <section id="appearance" className="scroll-mt-24">
      <SectionHeader
        icon={PaintBoardIcon}
        title="Appearance & Interface"
        description="Customize the visual theme, sounds, and interaction preferences across your dashboard."
      />

      <motion.div variants={settingsItemVariants} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Interface Theme</CardTitle>
            <CardDescription>Select how crwsync displays on your screen.</CardDescription>
          </CardHeader>

          <CardContent className="mt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = mounted && theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "relative flex flex-col p-4 rounded-xl text-left border-[1.5px] transition-all cursor-pointer group",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-foreground/20 hover:bg-accent/40 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3 w-full">
                      <div
                        className={cn(
                          "size-8 rounded-lg flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-base-200 text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={opt.icon} className="size-4" strokeWidth={2} />
                      </div>
                      {isSelected && (
                        <span className="flex items-center text-primary text-xs font-semibold">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" strokeWidth={2} />
                        </span>
                      )}
                    </div>

                    {opt.renderPreview()}

                    <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-card-foreground")}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                  </button>
                );
              })}
            </div>

            {mounted && (
              <p className="text-xs text-muted-foreground pt-1">
                Active resolved theme: <span className="font-medium text-foreground capitalize">{resolvedTheme}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sound & Motion</CardTitle>
            <CardDescription>Adjust feedback cues and animations.</CardDescription>
          </CardHeader>

          <CardContent className="mt-2 divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-base-200 flex items-center justify-center text-muted-foreground shrink-0">
                  <HugeiconsIcon
                    icon={soundEnabled ? VolumeHighIcon : VolumeMute01Icon}
                    className="size-4"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Notification sound cues</p>
                  <p className="text-xs text-muted-foreground">
                    Play a gentle audio chime when you receive mentions or task assignments.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => playNotificationSound()}
                  title="Test audio alert"
                  className="hidden sm:inline-flex text-xs h-8"
                >
                  Test chime
                </Button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  aria-label="Toggle notification sounds"
                  onClick={() => handleSoundToggle(!soundEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    soundEnabled ? "bg-primary" : "bg-base-300"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      soundEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-base-200 flex items-center justify-center text-muted-foreground shrink-0">
                  <HugeiconsIcon icon={ActivityIcon} className="size-4" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Reduced motion</p>
                  <p className="text-xs text-muted-foreground">
                    Simplify transitions and disable continuous blur effects for accessibility.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={reducedMotion}
                aria-label="Toggle reduced motion"
                onClick={() => handleMotionToggle(!reducedMotion)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  reducedMotion ? "bg-primary" : "bg-base-300"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    reducedMotion ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const ICON_BUTTON =
  "relative flex shrink-0 items-center justify-center size-9 pointer-coarse:size-11 rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary/50 cursor-pointer";

export function CollapsibleBar({
  id,
  label,
  open,
  onClose,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div
        id={id}
        role="region"
        aria-label={label}
        inert={!open}
        className="min-h-0 overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-base-200 px-4 py-2 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {children}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Hide ${label.toLowerCase()}`}
            aria-controls={id}
            aria-expanded={open}
            title={`Hide ${label.toLowerCase()}`}
            className={ICON_BUTTON}
          >
            <HugeiconsIcon
              icon={ArrowUp01Icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export function BarToggle({
  id,
  label,
  icon,
  open,
  onToggle,
  badge,
}: {
  id: string;
  label: string;
  icon: HugeiconsIconProps["icon"];
  open: boolean;
  onToggle: () => void;
  badge?: number;
}) {
  const action = `${open ? "Hide" : "Show"} ${label.toLowerCase()}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={badge && !open ? `${action} (${badge} active)` : action}
      aria-controls={id}
      aria-expanded={open}
      title={action}
      className={cn(ICON_BUTTON, open && "bg-foreground/10 text-foreground")}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4.5" />
      {!!badge && !open && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
        >
          {badge}
        </span>
      )}
    </button>
  );
}

"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  ArrowDownRight01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import type { MetricDelta } from "@crwsync/types";
import { cn } from "@/lib/utils";

export interface MetricDeltaBadgeProps {
  delta?: MetricDelta | null;
  className?: string;
}

const BADGE_STYLES = {
  positive: "bg-success/15 text-success border-success/30",
  negative: "bg-error/15 text-error border-error/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function MetricDeltaBadge({ delta, className }: MetricDeltaBadgeProps) {
  if (!delta) {
    return (
      <span
        data-testid="metric-delta-badge"
        className={cn(
          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums border",
          BADGE_STYLES.neutral,
          className
        )}
      >
        <span>—</span>
      </span>
    );
  }

  const { deltaPercent, trend } = delta;
  const isPositive =
    deltaPercent !== null ? deltaPercent > 0 : trend === "up";
  const isNegative =
    deltaPercent !== null ? deltaPercent < 0 : trend === "down";

  const badgeStyle = isPositive
    ? BADGE_STYLES.positive
    : isNegative
      ? BADGE_STYLES.negative
      : BADGE_STYLES.neutral;

  const formattedPercent =
    deltaPercent === null
      ? "0%"
      : `${deltaPercent > 0 ? "+" : deltaPercent < 0 ? "-" : ""}${
          Math.abs(deltaPercent) % 1 === 0
            ? Math.abs(deltaPercent)
            : Math.abs(deltaPercent).toFixed(1)
        }%`;

  return (
    <span
      data-testid="metric-delta-badge"
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums border",
        badgeStyle,
        className
      )}
    >
      {trend === "up" && (
        <HugeiconsIcon
          icon={ArrowUpRight01Icon}
          strokeWidth={2.5}
          className="size-3 shrink-0"
        />
      )}
      {trend === "down" && (
        <HugeiconsIcon
          icon={ArrowDownRight01Icon}
          strokeWidth={2.5}
          className="size-3 shrink-0"
        />
      )}
      {trend === "neutral" && (
        <HugeiconsIcon
          icon={MinusSignIcon}
          strokeWidth={2.5}
          className="size-3 shrink-0"
        />
      )}
      <span>{formattedPercent}</span>
    </span>
  );
}

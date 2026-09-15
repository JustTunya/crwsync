"use client";

import { useMemo } from "react";
import { format, parseISO, getDay } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { FireIcon, Calendar04Icon } from "@hugeicons/core-free-icons";
import type { ActivityHeatmapDay } from "@crwsync/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActivityHeatmapProps {
  heatmap?: ActivityHeatmapDay[];
  streakDays?: number;
  totalActiveDays?: number;
  className?: string;
}

const LEVEL_COLORS = [
  "bg-muted/50 border border-border/40",
  "bg-primary/30 border border-primary/40",
  "bg-primary/55 border border-primary/65",
  "bg-primary/80 border border-primary/90",
  "bg-primary border border-primary",
];

export function ActivityHeatmap({
  heatmap = [],
  streakDays = 0,
  totalActiveDays = 0,
  className,
}: ActivityHeatmapProps) {
  const { weeks, monthLabels, totalContributions } = useMemo(() => {
    let total = 0;
    for (const d of heatmap) {
      total += d.count;
    }

    if (!heatmap || heatmap.length === 0) {
      return { weeks: [], monthLabels: [], totalContributions: 0 };
    }

    const weeksGrid: ActivityHeatmapDay[][] = [];
    let currentWeek: ActivityHeatmapDay[] = [];

    const firstDate = parseISO(heatmap[0].date);
    const startDayOfWeek = getDay(firstDate);

    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ date: "", count: 0, level: -1 });
    }

    for (const day of heatmap) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksGrid.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: "", count: 0, level: -1 });
      }
      weeksGrid.push(currentWeek);
    }

    const months: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeksGrid.forEach((week, wIndex) => {
      const firstValidDay = week.find((d) => d.date);
      if (firstValidDay) {
        const d = parseISO(firstValidDay.date);
        const m = d.getMonth();
        if (m !== lastMonth) {
          months.push({ label: format(d, "MMM"), weekIndex: wIndex });
          lastMonth = m;
        }
      }
    });

    return {
      weeks: weeksGrid,
      monthLabels: months,
      totalContributions: total,
    };
  }, [heatmap]);

  return (
    <Card
      data-testid="activity-heatmap-card"
      className={cn(
        "flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm overflow-hidden",
        className
      )}
    >
      <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-card-foreground">
            Activity & Contributions
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalContributions} actions across the past 365 days
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            data-testid="heatmap-streak"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs font-semibold"
          >
            <HugeiconsIcon icon={FireIcon} strokeWidth={2.5} className="size-3.5" />
            <span className="tabular-nums">{streakDays} Day Streak</span>
          </div>

          <div
            data-testid="heatmap-active-days"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 text-muted-foreground text-xs font-medium"
          >
            <HugeiconsIcon icon={Calendar04Icon} strokeWidth={2} className="size-3.5 text-primary" />
            <span className="tabular-nums font-semibold text-foreground">
              {totalActiveDays}
            </span>{" "}
            Active Days
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2 overflow-x-auto pb-2">
        <div className="min-w-[700px] flex flex-col gap-1.5">
          {/* Month Labels */}
          <div className="flex text-[11px] font-medium text-muted-foreground ml-7 h-4 relative">
            {monthLabels.map((m, idx) => (
              <span
                key={`${m.label}-${idx}`}
                style={{ left: `${m.weekIndex * 13.5}px` }}
                className="absolute font-mono"
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid with Day Labels */}
          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-[9px] font-mono text-muted-foreground/80 py-0.5 w-5 shrink-0 select-none">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => {
                    if (day.level === -1 || !day.date) {
                      return (
                        <div
                          key={`empty-${wIdx}-${dIdx}`}
                          className="size-2.5 rounded-[3px] opacity-0"
                        />
                      );
                    }

                    const formattedDate = format(parseISO(day.date), "MMM d, yyyy");
                    const titleText = `${day.count} ${day.count === 1 ? "activity" : "activities"} on ${formattedDate}`;

                    return (
                      <div
                        key={day.date}
                        title={titleText}
                        className={cn(
                          "size-2.5 rounded-[3px] transition-transform hover:scale-125 cursor-pointer",
                          LEVEL_COLORS[Math.max(0, Math.min(4, day.level))]
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Less</span>
            <div className="flex items-center gap-1 mx-1">
              {LEVEL_COLORS.map((c, idx) => (
                <span
                  key={idx}
                  className={cn("size-2.5 rounded-[3px]", c)}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

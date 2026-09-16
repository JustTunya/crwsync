"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, getDay } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fire02Icon, Calendar04Icon } from "@hugeicons/core-free-icons";
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

const CELL_GAP = 3;
const LABEL_COL_WIDTH = 16;
const MONTH_ROW_HEIGHT = 16;
const MIN_CELL_SIZE = 4;
const DEFAULT_CELL_SIZE = 11;

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || weeks.length === 0) return;

    const measure = () => {
      const usable = el.clientWidth - LABEL_COL_WIDTH - weeks.length * CELL_GAP;
      setCellSize(Math.max(MIN_CELL_SIZE, Math.floor(usable / weeks.length)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [weeks.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length, cellSize]);

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
            <HugeiconsIcon icon={Fire02Icon} strokeWidth={2} className="size-3.5" />
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

      <CardContent className="p-0 pt-2 pb-2">
        <div ref={scrollRef} className="flex flex-col gap-2 overflow-x-auto">
          {/* Grid: row 1 = month labels, rows 2-8 = Sun..Sat, col 1 = day labels, cols 2+ = weeks */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `${LABEL_COL_WIDTH}px repeat(${weeks.length}, ${cellSize}px)`,
              gridTemplateRows: `${MONTH_ROW_HEIGHT}px repeat(7, ${cellSize}px)`,
              columnGap: `${CELL_GAP}px`,
              rowGap: `${CELL_GAP}px`,
            }}
          >
            {monthLabels.map((m, idx) => (
              <span
                key={`${m.label}-${idx}`}
                style={{ gridColumn: m.weekIndex + 2, gridRow: 1 }}
                className="text-[10px] font-medium font-mono text-muted-foreground whitespace-nowrap self-end"
              >
                {m.label}
              </span>
            ))}

            {(["Mon", "Wed", "Fri"] as const).map((label) => {
              const dayIdx = label === "Mon" ? 1 : label === "Wed" ? 3 : 5;
              return (
                <span
                  key={label}
                  style={{ gridColumn: 1, gridRow: dayIdx + 2 }}
                  className="text-[9px] font-mono text-muted-foreground/80 self-center"
                >
                  {label}
                </span>
              );
            })}

            {weeks.map((week, wIdx) =>
              week.map((day, dIdx) => {
                const gridPosition = { gridColumn: wIdx + 2, gridRow: dIdx + 2 };

                if (day.level === -1 || !day.date) {
                  return (
                    <div
                      key={`empty-${wIdx}-${dIdx}`}
                      style={gridPosition}
                      className="rounded-[2px] opacity-0"
                    />
                  );
                }

                const formattedDate = format(parseISO(day.date), "MMM d, yyyy");
                const titleText = `${day.count} ${day.count === 1 ? "activity" : "activities"} on ${formattedDate}`;

                return (
                  <div
                    key={day.date}
                    title={titleText}
                    style={gridPosition}
                    className={cn(
                      "rounded-[2px] transition-transform hover:scale-125 cursor-pointer",
                      LEVEL_COLORS[Math.max(0, Math.min(4, day.level))]
                    )}
                  />
                );
              })
            )}
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
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

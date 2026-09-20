"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { StatisticsTimeseriesPoint } from "@crwsync/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ThroughputChartProps {
  timeseries?: StatisticsTimeseriesPoint[];
  isLoading?: boolean;
  className?: string;
}

const COLOR_COMPLETED = "var(--color-primary, oklch(0.703 0.188 36.91))";
const COLOR_CREATED = "var(--color-info, oklch(0.50 0.18 245))";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    dataKey?: string;
    color?: string;
    payload?: StatisticsTimeseriesPoint;
  }>;
  label?: string;
}

function ThroughputTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const completed = payload.find((p) => p.dataKey === "completed")?.value ?? 0;
  const created = payload.find((p) => p.dataKey === "created")?.value ?? 0;
  const net = completed - created;

  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-xl text-popover-foreground min-w-44 z-50">
      <p className="text-xs font-semibold text-muted-foreground mb-2 pb-1 border-b border-border">
        {label}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLOR_COMPLETED }}
            />
            <span className="text-muted-foreground font-medium">Completed</span>
          </div>
          <span className="font-semibold tabular-nums text-foreground">
            {completed}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLOR_CREATED }}
            />
            <span className="text-muted-foreground font-medium">Created</span>
          </div>
          <span className="font-semibold tabular-nums text-foreground">
            {created}
          </span>
        </div>

        <div className="pt-1.5 mt-1 border-t border-border flex items-center justify-between gap-3 font-medium">
          <span className="text-muted-foreground">Net Throughput</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              net > 0 ? "text-success" : net < 0 ? "text-error" : "text-muted-foreground"
            )}
          >
            {net > 0 ? `+${net}` : net}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ThroughputChart({
  timeseries = [],
  isLoading,
  className,
}: ThroughputChartProps) {
  const { totalCompleted, totalCreated } = useMemo(() => {
    let completed = 0;
    let created = 0;
    for (const pt of timeseries) {
      completed += pt.completed;
      created += pt.created;
    }
    return { totalCompleted: completed, totalCreated: created };
  }, [timeseries]);

  const hasData = timeseries.length > 0;

  return (
    <Card
      data-testid="throughput-chart"
      className={cn("flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm", className)}
    >
      <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-card-foreground">
            Throughput & Velocity
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Created vs. Completed work volume across time
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/30 text-xs font-medium">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: COLOR_COMPLETED }}
            />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-semibold tabular-nums text-foreground">
              {totalCompleted}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/30 text-xs font-medium">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: COLOR_CREATED }}
            />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-semibold tabular-nums text-foreground">
              {totalCreated}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2">
        {isLoading ? (
          <div className="h-72 w-full animate-pulse rounded-xl bg-muted/60" />
        ) : hasData ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeseries}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="completedThroughputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_COMPLETED} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLOR_COMPLETED} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="createdThroughputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_CREATED} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLOR_CREATED} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border"
                  opacity={0.35}
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  dy={8}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                  dx={-4}
                />

                <RechartsTooltip
                  content={<ThroughputTooltip />}
                  cursor={{
                    stroke: "oklch(0.703 0.188 36.91)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                    opacity: 0.6,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke={COLOR_COMPLETED}
                  strokeWidth={2.5}
                  fill="url(#completedThroughputGrad)"
                  dot={false}
                  activeDot={{
                    r: 4.5,
                    fill: COLOR_COMPLETED,
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke={COLOR_CREATED}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#createdThroughputGrad)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: COLOR_CREATED,
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
            <p className="text-sm font-medium text-muted-foreground">
              No activity recorded in this period
            </p>
            <p className="text-xs text-muted-foreground/75 mt-1">
              Created and completed task throughput will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorkspace } from "@/providers/workspace.provider";
import { useStatistics } from "@/hooks/use-statistics";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INTERVALS = [
  { value: "1w", label: "1W" },
  { value: "2w", label: "2W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
] as const;

const DEFAULT_INTERVAL = "1m";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCycleTime(seconds: number | null): string {
  if (seconds === null) return "—";
  
  const totalSeconds = Math.round(seconds);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    return `${m}m`;
  }
  
  if (totalSeconds < 86400) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-popover-foreground">
        {payload[0].value} {payload[0].value === 1 ? "task" : "tasks"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  unit,
  loading,
}: {
  label: string;
  value: string | number;
  unit?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 w-24 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-card-foreground">
            {value}
          </p>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function StatisticsDashboard({
  initialInterval,
}: {
  initialInterval?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const interval = searchParams.get("interval") ?? initialInterval ?? DEFAULT_INTERVAL;

  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const { data, isLoading } = useStatistics(workspaceId, interval);

  /* Sync interval to URL */
  const setInterval = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_INTERVAL) {
        params.delete("interval");
      } else {
        params.set("interval", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /* Format chart data */
  const chartData = useMemo(
    () =>
      (data?.velocityTimeline ?? []).map((d) => ({
        ...d,
        label: formatDate(d.date),
      })),
    [data?.velocityTimeline]
  );

  const hasChartData = chartData.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between h-16 pl-16 pr-24 border-b border-base-200">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Statistics</h1>
          <p className="text-sm text-muted-foreground leading-4 font-mono">
            Personal metrics &amp; workspace activity
          </p>
        </div>

        {/* Interval toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
          {INTERVALS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setInterval(opt.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                interval === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Active Workload"
            value={data?.personalWorkload ?? 0}
            unit="tasks"
            loading={isLoading}
          />
          <StatCard
            label="Velocity"
            value={data?.personalVelocity ?? 0}
            unit="completed"
            loading={isLoading}
          />
          <StatCard
            label="Avg. Cycle Time"
            value={formatCycleTime(data?.personalCycleTime ?? null)}
            loading={isLoading}
          />
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-card-foreground mb-4">
            Workspace Velocity
          </p>

          {isLoading ? (
            <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
          ) : hasChartData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient
                    id="velocityGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="oklch(0.703 0.188 36.91)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.703 0.188 36.91)"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border"
                  opacity={0.4}
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
                  content={<ChartTooltip />}
                  cursor={{
                    stroke: "oklch(0.703 0.188 36.91)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="oklch(0.703 0.188 36.91)"
                  strokeWidth={2}
                  fill="url(#velocityGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "oklch(0.703 0.188 36.91)",
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            /* Empty state */
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No activity in this period
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

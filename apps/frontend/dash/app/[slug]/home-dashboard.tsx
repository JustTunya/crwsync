"use client";

import { useUser } from "@/providers/user.provider";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { GlassBox } from "@/components/ui/glassbox";
import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                         */
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
    <GlassBox className="flex flex-1 gap-2 py-2 px-4 w-full!">
      <h1 className="text-sm font-medium text-muted-foreground">
        {label}
      </h1>
      <div className="flex items-baseline gap-1.5">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-card-foreground">
          {value}
        </p>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
    </GlassBox>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function HomeDashboard() {
  const user = useUser();

  const greeting = getGreeting();
  const today = getTodayFormatted();
  const firstname = user?.firstname ?? "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between h-16 pl-16 pr-24 border-b border-base-200">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground leading-4 font-mono">
            Workspace overview
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-12">
        <section className="flex flex-col justify-center items-center gap-0.5 w-full">
          <h1 className="text-3xl font-semibold text-foreground">
            {greeting}, {firstname}
          </h1>
          <p className="text-lg text-muted-foreground font-mono tracking-tighter">
            <span className="text-muted-foreground/75">Today is</span> {today}
          </p>
        </section>

        {/* Quick Stats */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-medium text-muted-foreground">Quick Stats</h2>
            <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2.5} className="size-3.5 text-muted-foreground cursor-pointer" />
          </div>
          <div className="flex gap-2">
            <StatCard label="Total Tasks" value="0" unit="tasks" loading={false} />
            <StatCard label="Completed" value="0" unit="tasks" loading={false} />
            <StatCard label="In Progress" value="0" unit="tasks" loading={false} />
          </div>
        </section>
      </div>
    </div>
  );
}
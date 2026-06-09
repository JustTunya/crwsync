"use client";

import { useUser } from "@/providers/user.provider";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { GlassBox } from "@/components/ui/glassbox";
import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useWorkspaceModules, useTogglePinModule } from "@/hooks/use-workspace-modules";
import { getModuleIcon, getModuleHref } from "@/lib/sidebar.utils";
import Link from "next/link";
import { useWorkspace } from "@/providers/workspace.provider";

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

export function HomeDashboard({ slug }: { slug: string }) {
  const user = useUser();
  const { activeWorkspace } = useWorkspace();
  const { data: modules, isLoading } = useWorkspaceModules(activeWorkspace?.id);
  const togglePinModule = useTogglePinModule(activeWorkspace?.id || "");

  const pinnedModules = modules?.filter(m => m.isPinned) || [];

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

        {/* Pinned Modules */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-medium text-muted-foreground">Pinned Modules</h2>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : pinnedModules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedModules.map(mod => {
                const Icon = getModuleIcon(mod.type);
                return (
                  <GlassBox key={mod.id} className="relative group flex flex-row items-center gap-3 py-3 px-4 w-full! hover:bg-base-200/30 transition-colors">
                    <Link href={getModuleHref(slug, mod)} className="flex-1 min-w-0 flex items-center gap-3 outline-none">
                      <div className="flex items-center justify-center size-8 rounded-md bg-base-200 text-foreground shrink-0">
                        <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-4" />
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{mod.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize truncate">{mod.type.toLowerCase()}</p>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePinModule.mutate({ moduleId: mod.id, isPinned: false });
                      }}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-8 rounded-md hover:bg-base-300 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Unpin module"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                    </button>
                  </GlassBox>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 border border-dashed border-base-200 rounded-xl bg-base-100/50">
              <p className="text-sm text-muted-foreground">No pinned modules yet. Pin a module from the sidebar to see it here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
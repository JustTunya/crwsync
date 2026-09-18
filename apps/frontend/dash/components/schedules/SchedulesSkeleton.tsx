"use client";

import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted/70 rounded-md", className)} />;
}

function SchedulesHeaderSkeleton() {
  return (
    <div data-testid="schedules-skeleton-header" className="flex flex-col">
      <div className="flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <SkeletonBox className="size-8 rounded-lg shrink-0" />
          <div className="flex flex-col gap-1.5">
            <SkeletonBox className="h-4.5 w-24" />
            <SkeletonBox className="h-3 w-32" />
          </div>
        </div>
        <SkeletonBox className="size-8 rounded-lg shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 md:px-4 xl:px-6 py-2 md:py-2.5 border-b border-base-200 shrink-0">
        <div className="hidden lg:flex items-center gap-2">
          <SkeletonBox className="h-7 w-32 rounded-lg" />
          <SkeletonBox className="h-7 w-24 rounded-lg" />
        </div>
        <div className="flex lg:hidden items-center gap-2">
          <SkeletonBox className="h-7 w-20 rounded-lg" />
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <SkeletonBox className="h-6 w-20 rounded-full hidden sm:block" />
          <SkeletonBox className="h-6 w-24 rounded-full hidden md:block" />
          <SkeletonBox className="h-6 w-24 rounded-full hidden xl:block" />
        </div>
      </div>
    </div>
  );
}

function ScheduleTaskRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-border bg-card shadow-xs">
      <div className="shrink-0 flex items-center justify-center p-0.5">
        <SkeletonBox className="size-4 rounded" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-3.5 w-12" />
          <SkeletonBox className="h-3.5 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-3 w-28" />
          <SkeletonBox className="h-3 w-16" />
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 sm:gap-2.5">
        <SkeletonBox className="size-5 rounded-full hidden sm:block" />
        <SkeletonBox className="h-6 w-24 rounded-md" />
      </div>
    </div>
  );
}

function SchedulesAgendaSectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <SkeletonBox className="h-4 w-24" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <ScheduleTaskRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function SchedulesAgendaSkeleton() {
  return (
    <div data-testid="schedules-skeleton-agenda" className="flex-1 min-w-0 w-full flex flex-col gap-6">
      <SchedulesAgendaSectionSkeleton rows={2} />
      <SchedulesAgendaSectionSkeleton rows={3} />
      <SchedulesAgendaSectionSkeleton rows={2} />
    </div>
  );
}

function SchedulesCalendarSidebarSkeleton() {
  return (
    <aside data-testid="schedules-skeleton-sidebar" className="flex flex-col gap-4 w-full @4xl:w-72 shrink-0">
      <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-border bg-card shadow-sm">
        <SkeletonBox className="h-64 w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border bg-card shadow-sm">
        <SkeletonBox className="h-3.5 w-24" />
        <SkeletonBox className="h-9 w-full rounded-lg" />
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          <SkeletonBox className="h-3.5 w-32" />
          <SkeletonBox className="size-4 rounded" />
        </div>
      </div>
    </aside>
  );
}

export function SchedulesSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="schedules-skeleton"
      className={cn("flex flex-col h-full overflow-hidden bg-background", className)}
    >
      <SchedulesHeaderSkeleton />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col @4xl:flex-row gap-6 items-start">
          <SchedulesAgendaSkeleton />
          <SchedulesCalendarSidebarSkeleton />
        </div>
      </div>
    </div>
  );
}

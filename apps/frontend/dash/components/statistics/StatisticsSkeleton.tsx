"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted/70 rounded-md", className)} />;
}

function StatisticsHeaderSkeleton() {
  return (
    <div data-testid="statistics-skeleton-header" className="flex flex-col">
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
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-7 w-56 rounded-lg" />
          <SkeletonBox className="h-7 w-28 rounded-lg hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-7 w-40 rounded-lg hidden md:block" />
          <SkeletonBox className="size-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function StatisticsKpiCardsSkeleton() {
  return (
    <div data-testid="statistics-skeleton-kpis" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="flex flex-col gap-1.5 p-3.5 rounded-lg border-border bg-card">
          <div className="flex items-center justify-between gap-2">
            <SkeletonBox className="h-3 w-24" />
            <SkeletonBox className="h-4 w-10 rounded-full" />
          </div>
          <SkeletonBox className="h-7 w-16" />
          <SkeletonBox className="h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}

function StatisticsThroughputSkeleton() {
  return (
    <Card data-testid="statistics-skeleton-throughput" className="flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <SkeletonBox className="h-4.5 w-44" />
          <SkeletonBox className="h-3 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-6 w-28 rounded-lg" />
          <SkeletonBox className="h-6 w-24 rounded-lg" />
        </div>
      </CardHeader>
      <SkeletonBox className="h-72 w-full rounded-xl" />
    </Card>
  );
}

function StatisticsWorkloadSkeleton() {
  return (
    <Card data-testid="statistics-skeleton-workload" className="flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="p-0 flex flex-col gap-1.5">
        <SkeletonBox className="h-4.5 w-48" />
        <SkeletonBox className="h-3 w-64" />
      </CardHeader>
      <div className="flex flex-col gap-2 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </Card>
  );
}

function StatisticsDistributionCardSkeleton({ testId }: { testId: string }) {
  return (
    <Card data-testid={testId} className="flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm">
      <SkeletonBox className="h-4.5 w-40" />
      <SkeletonBox className="h-48 w-full rounded-xl" />
    </Card>
  );
}

export function StatisticsSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="statistics-skeleton"
      className={cn("flex flex-col h-full overflow-hidden bg-background", className)}
    >
      <StatisticsHeaderSkeleton />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <StatisticsKpiCardsSkeleton />
          <StatisticsThroughputSkeleton />
          <StatisticsWorkloadSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatisticsDistributionCardSkeleton testId="statistics-skeleton-priority" />
            <StatisticsDistributionCardSkeleton testId="statistics-skeleton-status-flow" />
          </div>
        </div>
      </div>
    </div>
  );
}

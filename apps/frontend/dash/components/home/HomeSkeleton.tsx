"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted/70 rounded-md", className)} />;
}

function HomeHeaderSkeleton() {
  return (
    <div
      data-testid="home-skeleton-header"
      className="flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200 shrink-0 bg-card/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <SkeletonBox className="size-8 rounded-lg shrink-0" />
        <div className="flex flex-col gap-1.5 min-w-0">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-3 w-24" />
        </div>
      </div>
      <SkeletonBox className="size-8 rounded-lg shrink-0" />
    </div>
  );
}

function HomeFocusSkeleton() {
  return (
    <Card data-testid="home-skeleton-focus" className="flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SkeletonBox className="h-5 w-24" />
        <div className="bg-muted/70 p-0.5 rounded-lg flex items-center gap-1 border border-border/40">
          <SkeletonBox className="h-6 w-20 rounded-md" />
          <SkeletonBox className="h-6 w-20 rounded-md" />
          <SkeletonBox className="h-6 w-24 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBox className="h-12 w-full rounded-xl" />
        <SkeletonBox className="h-12 w-full rounded-xl" />
        <SkeletonBox className="h-12 w-full rounded-xl" />
      </div>
    </Card>
  );
}

function HomeProjectsSkeleton() {
  return (
    <div data-testid="home-skeleton-projects" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="h-4 w-6 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <Card key={i} className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col items-center justify-start gap-3.5">
            <div className="flex items-center justify-between gap-2 w-full">
              <SkeletonBox className="h-4 w-28" />
              <SkeletonBox className="size-4 rounded" />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <SkeletonBox className="h-1.5 w-full rounded-full" />
              <div className="flex justify-between items-center gap-2">
                <SkeletonBox className="h-3 w-24" />
                <SkeletonBox className="h-3 w-8" />
              </div>
            </div>
            <div className="flex items-center -space-x-1.5 w-full">
              <SkeletonBox className="size-6 rounded-full" />
              <SkeletonBox className="size-6 rounded-full" />
              <SkeletonBox className="size-6 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HomePinnedSkeleton() {
  return (
    <div data-testid="home-skeleton-pinned" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="h-4 w-6 rounded-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-3.5 rounded-2xl border-border bg-card shadow-sm flex flex-col items-stretch justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SkeletonBox className="size-8 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <SkeletonBox className="h-3.5 w-20" />
                <SkeletonBox className="h-3 w-14" />
              </div>
            </div>
            <SkeletonBox className="h-3 w-full mt-1" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function HomeActivitySkeleton() {
  return (
    <div data-testid="home-skeleton-activity" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBox className="h-4 w-28" />
        <SkeletonBox className="h-4 w-10 rounded-full" />
      </div>
      <Card className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2.5">
            <SkeletonBox className="size-6 rounded-full shrink-0 mt-0.5" />
            <SkeletonBox className="h-3 flex-1" />
            <SkeletonBox className="h-2.5 w-8 shrink-0 mt-0.5" />
          </div>
        ))}
      </Card>
    </div>
  );
}

function HomeVelocitySkeleton() {
  return (
    <Card data-testid="home-skeleton-velocity" className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
      <SkeletonBox className="h-4 w-36" />
      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
        <SkeletonBox className="h-8 w-14" />
        <SkeletonBox className="h-3 w-40" />
      </div>
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-3 w-12" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-3 w-12" />
      </div>
    </Card>
  );
}

export function HomeSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="home-skeleton"
      className={cn("flex flex-col h-full overflow-hidden bg-background", className)}
    >
      <HomeHeaderSkeleton />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 @container">
        <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-6 max-w-[1600px] mx-auto items-start">
          <div className="@5xl:col-span-8 flex flex-col gap-6 min-w-0">
            <HomeFocusSkeleton />
            <div className="flex flex-col gap-6 @5xl:hidden">
              <HomeActivitySkeleton />
              <HomeVelocitySkeleton />
            </div>
            <HomeProjectsSkeleton />
            <HomePinnedSkeleton />
          </div>

          <div className="hidden @5xl:flex @5xl:col-span-4 flex-col gap-6 min-w-0">
            <HomeActivitySkeleton />
            <HomeVelocitySkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

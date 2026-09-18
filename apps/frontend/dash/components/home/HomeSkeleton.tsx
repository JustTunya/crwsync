"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted/70 rounded-md", className)} />;
}

function HomeFocusSkeleton() {
  return (
    <Card data-testid="home-skeleton-focus" className="p-5 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
      <SkeletonBox className="h-6 w-40" />
      <div className="flex gap-2">
        <SkeletonBox className="h-7 w-20" />
        <SkeletonBox className="h-7 w-20" />
        <SkeletonBox className="h-7 w-20" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBox className="h-10 w-full" />
        <SkeletonBox className="h-10 w-full" />
        <SkeletonBox className="h-10 w-full" />
      </div>
    </Card>
  );
}

function HomeProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <SkeletonBox className="h-6 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
          <SkeletonBox className="h-5 w-24" />
          <SkeletonBox className="h-1.5 w-full" />
        </Card>
        <Card className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
          <SkeletonBox className="h-5 w-24" />
          <SkeletonBox className="h-1.5 w-full" />
        </Card>
      </div>
    </div>
  );
}

function HomePinnedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <SkeletonBox className="h-6 w-32" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SkeletonBox className="h-20 w-full" />
        <SkeletonBox className="h-20 w-full" />
        <SkeletonBox className="h-20 w-full" />
        <SkeletonBox className="h-20 w-full" />
      </div>
    </div>
  );
}

function HomeCrewSkeleton() {
  return (
    <Card data-testid="home-skeleton-crew" className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
      <SkeletonBox className="h-6 w-28" />
      <div className="flex flex-col gap-3">
        <SkeletonBox className="h-9 w-full" />
        <SkeletonBox className="h-9 w-full" />
        <SkeletonBox className="h-9 w-full" />
        <SkeletonBox className="h-9 w-full" />
      </div>
    </Card>
  );
}

function HomeActivitySkeleton() {
  return (
    <Card data-testid="home-skeleton-activity" className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
      <SkeletonBox className="h-6 w-28" />
      <div className="flex flex-col gap-3">
        <SkeletonBox className="h-8 w-full" />
        <SkeletonBox className="h-8 w-full" />
        <SkeletonBox className="h-8 w-full" />
        <SkeletonBox className="h-8 w-full" />
      </div>
    </Card>
  );
}

function HomeVelocitySkeleton() {
  return (
    <Card data-testid="home-skeleton-velocity" className="p-4 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-3">
      <SkeletonBox className="h-6 w-36" />
      <SkeletonBox className="h-9 w-16" />
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-full" />
    </Card>
  );
}

export function HomeSkeleton({ className }: { className?: string }) {
  return (
    <div data-testid="home-skeleton" className={cn("flex flex-col", className)}>
      <div className="h-16 w-full border-b border-border px-4 flex items-center justify-between bg-card/40">
        <SkeletonBox className="h-5 w-40" />
        <SkeletonBox className="h-8 w-24" />
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <HomeFocusSkeleton />
          <HomeProjectsSkeleton />
          <HomePinnedSkeleton />
        </div>

        <div className="xl:col-span-4 space-y-6">
          <HomeCrewSkeleton />
          <HomeActivitySkeleton />
          <HomeVelocitySkeleton />
        </div>
      </div>
    </div>
  );
}

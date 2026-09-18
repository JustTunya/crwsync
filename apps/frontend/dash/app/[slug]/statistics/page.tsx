import { Suspense } from "react";
import { StatisticsDashboard } from "./statistics-dashboard";
import { StatisticsSkeleton } from "@/components/statistics/StatisticsSkeleton";

export const metadata = {
  title: "Statistics | crwsync",
  description: "View workspace performance metrics, task velocity, and team productivity insights.",
};

export default async function StatisticsPage({
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ interval?: string; tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<StatisticsSkeleton />}>
      <StatisticsDashboard
        initialInterval={resolvedSearchParams.interval}
        initialTab={resolvedSearchParams.tab}
      />
    </Suspense>
  );
}

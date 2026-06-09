import { Suspense } from "react";
import { StatisticsDashboard } from "./statistics-dashboard";

export const metadata = {
  title: "Statistics | crwsync",
  description: "View workspace performance metrics, task velocity, and team productivity insights.",
};

export default async function StatisticsPage({
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ interval?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground animate-pulse">Loading statistics...</div>}>
      <StatisticsDashboard 
        initialInterval={resolvedSearchParams.interval} 
      />
    </Suspense>
  );
}
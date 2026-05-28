import { Suspense } from "react";
import { StatisticsDashboard } from "./statistics-dashboard";

export const metadata = {
  title: "Statistics | crwsync",
  description: "View workspace performance metrics, task velocity, and team productivity insights.",
};

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ interval?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense>
      <StatisticsDashboard 
        slug={resolvedParams.slug}
        initialInterval={resolvedSearchParams.interval} 
      />
    </Suspense>
  );
}
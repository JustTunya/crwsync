import { Suspense } from "react";
import { HomeDashboard } from "./home-dashboard";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";

export const metadata = {
  title: "Home | crwsync",
  description: "Your workspace command center — personal focus, active projects, and live workspace pulse.",
};

export default async function HomePage({ params }: { params: { slug: string } }) {
  const { slug } = await params;

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeDashboard slug={slug} />
    </Suspense>
  );
}
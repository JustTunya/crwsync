import { Suspense } from "react";
import { HomeDashboard } from "./home-dashboard";

export const metadata = {
  title: "Home | crwsync",
  description: "Your workspace dashboard — personal metrics, shared modules, and boards at a glance.",
};

export default async function HomePage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground animate-pulse">Loading dashboard...</div>}>
      <HomeDashboard slug={slug} />
    </Suspense>
  );
}
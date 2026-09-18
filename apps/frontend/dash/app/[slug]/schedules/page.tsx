import { Suspense } from "react";
import { SchedulesDashboard } from "./schedules-dashboard";
import { SchedulesSkeleton } from "@/components/schedules/SchedulesSkeleton";

export const metadata = {
  title: "Schedules | crwsync",
  description:
    "Track deadlines, scheduled deliveries, and cadence across all boards.",
};

export default function SchedulesPage() {
  return (
    <Suspense fallback={<SchedulesSkeleton />}>
      <SchedulesDashboard />
    </Suspense>
  );
}

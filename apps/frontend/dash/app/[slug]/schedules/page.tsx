import { Suspense } from "react";
import { SchedulesDashboard } from "./schedules-dashboard";

export const metadata = {
  title: "Schedules | crwsync",
  description:
    "Track deadlines, scheduled deliveries, and cadence across all boards.",
};

export default function SchedulesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground animate-pulse">
          Loading schedules...
        </div>
      }
    >
      <SchedulesDashboard />
    </Suspense>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { StatisticsInterval, StatisticsTab } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { useStatistics } from "@/hooks/use-statistics";
import { LSidebarToggle } from "@/components/l-sidebar";
import { RSidebarToggle } from "@/components/r-sidebar";
import { StatisticsHeader } from "@/components/statistics/StatisticsHeader";
import { StatisticsOverviewTab } from "@/components/statistics/StatisticsOverviewTab";
import { StatisticsPersonalTab } from "@/components/statistics/StatisticsPersonalTab";
import { StatisticsProjectsTab } from "@/components/statistics/StatisticsProjectsTab";
import { StatisticsSkeleton } from "@/components/statistics/StatisticsSkeleton";

const DEFAULT_INTERVAL: StatisticsInterval = "30d";
const DEFAULT_TAB: StatisticsTab = "overview";

const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: "easeInOut",
    },
  },
};

export function StatisticsDashboard({
  initialInterval,
  initialTab,
}: {
  initialInterval?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();

  const slug = (params?.slug as string) || "";
  const { activeId: workspaceId } = useWorkspace();

  const tabParam = searchParams.get("tab") as StatisticsTab | null;
  const activeTab: StatisticsTab =
    tabParam === "personal" || tabParam === "projects" || tabParam === "overview"
      ? tabParam
      : (initialTab as StatisticsTab) || DEFAULT_TAB;

  const intervalParam = searchParams.get("interval") as StatisticsInterval | null;
  const interval: StatisticsInterval = intervalParam || (initialInterval as StatisticsInterval) || DEFAULT_INTERVAL;

  const projectId = searchParams.get("projectId") || undefined;
  const boardId = searchParams.get("boardId") || undefined;

  const { data, isLoading, isFetching, refetch, error } = useStatistics(
    workspaceId,
    {
      interval,
      projectId,
      boardId,
    }
  );

  const updateQueryParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || (key === "tab" && val === DEFAULT_TAB) || (key === "interval" && val === DEFAULT_INTERVAL)) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, val);
        }
      });
      const qs = nextParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleTabChange = useCallback(
    (nextTab: StatisticsTab) => {
      updateQueryParams({ tab: nextTab });
    },
    [updateQueryParams]
  );

  const handleIntervalChange = useCallback(
    (nextInterval: StatisticsInterval) => {
      updateQueryParams({ interval: nextInterval });
    },
    [updateQueryParams]
  );

  const handleScopeChange = useCallback(
    (nextProjId?: string, nextBoardId?: string) => {
      updateQueryParams({ projectId: nextProjId, boardId: nextBoardId });
    },
    [updateQueryParams]
  );

  if (isLoading || !workspaceId) {
    return <StatisticsSkeleton />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Primary Header */}
      <header className="flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <LSidebarToggle />
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Statistics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-4 font-mono">
              Workspace analytics
            </p>
          </div>
        </div>
        <RSidebarToggle />
      </header>

      {/* Secondary Filter Header */}
      <StatisticsHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        interval={interval}
        onIntervalChange={handleIntervalChange}
        projectId={projectId}
        boardId={boardId}
        onScopeChange={handleScopeChange}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        projects={data?.projects}
        velocityCount={data?.summary?.velocity?.current}
        overdueCount={data?.summary?.overdueTasks?.current}
        throughputRatio={data?.summary?.throughputRatio?.current}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div
              data-testid="statistics-error-banner"
              className="p-4 rounded-xl border border-error/30 bg-error/10 text-error text-xs font-medium flex items-center justify-between gap-3"
            >
              <span>{error.message || "Failed to load workspace statistics"}</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="underline font-semibold hover:opacity-80 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="tab-overview"
                variants={tabContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <StatisticsOverviewTab
                  data={data}
                  isLoading={isLoading}
                />
              </motion.div>
            )}

            {activeTab === "personal" && (
              <motion.div
                key="tab-personal"
                variants={tabContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <StatisticsPersonalTab
                  data={data}
                  isLoading={isLoading}
                />
              </motion.div>
            )}

            {activeTab === "projects" && (
              <motion.div
                key="tab-projects"
                variants={tabContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <StatisticsProjectsTab
                  projects={data?.projects}
                  slug={slug}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

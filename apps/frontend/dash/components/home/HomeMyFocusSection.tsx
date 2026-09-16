"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Task01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { HomeTaskItem } from "@crwsync/types";
import { HomeTaskRow } from "@/components/home/HomeTaskRow";
import { GlassBox } from "@/components/ui/glassbox";
import { cn } from "@/lib/utils";

export type FocusTab = "overdue" | "dueToday" | "inProgress";

export interface HomeMyFocusSectionProps {
  focus?: {
    overdue: HomeTaskItem[];
    dueToday: HomeTaskItem[];
    inProgress: HomeTaskItem[];
  };
  slug: string;
  onSelectTask?: (task: HomeTaskItem) => void;
  onToggleComplete?: (task: HomeTaskItem) => void;
  onReschedule?: (task: HomeTaskItem, newDueDate: string | null) => void;
  onNewTask?: () => void;
  className?: string;
}

const TAB_LABELS: Record<FocusTab, string> = {
  overdue: "Overdue",
  dueToday: "Due Today",
  inProgress: "In Progress",
};

function getDefaultTab(focus?: HomeMyFocusSectionProps["focus"]): FocusTab {
  if (focus?.overdue.length) return "overdue";
  if (focus?.dueToday.length) return "dueToday";
  return "inProgress";
}

export function HomeMyFocusSection({
  focus,
  slug,
  onSelectTask,
  onToggleComplete,
  onReschedule,
  onNewTask,
  className,
}: HomeMyFocusSectionProps) {
  const [activeTab, setActiveTab] = useState<FocusTab>(() => getDefaultTab(focus));

  const tasksByTab: Record<FocusTab, HomeTaskItem[]> = {
    overdue: focus?.overdue ?? [],
    dueToday: focus?.dueToday ?? [],
    inProgress: focus?.inProgress ?? [],
  };
  const activeTasks = tasksByTab[activeTab];
  const hasOverdue = tasksByTab.overdue.length > 0;

  return (
    <GlassBox className={cn("flex flex-col items-stretch gap-3 w-full! mx-0! p-5", className)}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Task01Icon} className="size-4 text-primary" />
          My Focus
        </h2>

        <div className="flex items-center gap-1">
          <div className="bg-base-200/70 p-0.5 rounded-lg flex items-center gap-1">
            {(Object.keys(TAB_LABELS) as FocusTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                data-testid={`home-focus-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  tab === "overdue" && hasOverdue
                    ? "text-alert bg-alert/15 border border-alert/30 font-semibold"
                    : activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "overdue" && hasOverdue && (
                  <HugeiconsIcon icon={Alert02Icon} className="size-3" />
                )}
                {TAB_LABELS[tab]}
                <span
                  data-testid={`home-focus-tab-count-${tab}`}
                  className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold bg-base-300/60 text-muted-foreground"
                >
                  {tasksByTab[tab].length}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="home-focus-new-task-button"
            aria-label="New task"
            onClick={onNewTask}
            className="flex items-center justify-center size-7 rounded-md hover:bg-base-200 text-muted-foreground transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          </button>
        </div>
      </div>

      {activeTasks.length > 0 ? (
        <div className="space-y-2" data-testid="home-focus-task-list">
          {activeTasks.map((task) => (
            <HomeTaskRow
              key={task.id}
              task={task}
              slug={slug}
              onSelectTask={onSelectTask}
              onToggleComplete={onToggleComplete}
              onReschedule={onReschedule}
            />
          ))}
        </div>
      ) : (
        <div
          data-testid="home-focus-empty-state"
          className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-base-200/80 bg-base-100/40"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-8 text-success/80" />
          <p className="mt-2 text-sm font-semibold text-foreground">
            {activeTab === "overdue" ? "No overdue tasks" : "All clear"}
          </p>
          <p className="text-xs text-muted-foreground">You&apos;re all caught up on this list.</p>
        </div>
      )}
    </GlassBox>
  );
}

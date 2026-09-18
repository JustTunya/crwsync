"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Task01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { HomeTaskItem } from "@crwsync/types";
import { ScheduleTaskRow } from "@/components/schedules/ScheduleTaskRow";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FocusTab = "overdue" | "dueToday" | "inProgress";

export interface HomeMyFocusSectionProps {
  focus?: {
    overdue: HomeTaskItem[];
    dueToday: HomeTaskItem[];
    inProgress: HomeTaskItem[];
  };
  slug?: string;
  onSelectTask?: (task: HomeTaskItem) => void;
  onToggleComplete?: (task: HomeTaskItem, completed?: boolean) => void;
  onReschedule?: (task: HomeTaskItem, newDueDate: string | null) => void;
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
  onSelectTask,
  onToggleComplete,
  onReschedule,
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
    <Card className={cn("flex flex-col gap-4 p-5 rounded-2xl border-border bg-card shadow-sm", className)}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Task01Icon} className="size-4 text-primary" />
          My Focus
        </h2>

        <div className="bg-muted/70 p-0.5 rounded-lg flex items-center gap-1 border border-border/40">
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
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "overdue" && hasOverdue && (
                <HugeiconsIcon icon={Alert02Icon} className="size-3" />
              )}
              {TAB_LABELS[tab]}
              <span
                data-testid={`home-focus-tab-count-${tab}`}
                className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground"
              >
                {tasksByTab[tab].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTasks.length > 0 ? (
        <div className="space-y-2" data-testid="home-focus-task-list">
          {activeTasks.map((task) => (
            <ScheduleTaskRow
              key={task.id}
              task={task}
              onTaskClick={onSelectTask}
              onToggleComplete={onToggleComplete}
              onReschedule={onReschedule}
            />
          ))}
        </div>
      ) : (
        <div
          data-testid="home-focus-empty-state"
          className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-muted/20"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-8 text-success/80" />
          <p className="mt-2 text-sm font-semibold text-foreground">
            {activeTab === "overdue" ? "No overdue tasks" : "All clear"}
          </p>
          <p className="text-xs text-muted-foreground">You&apos;re all caught up on this list.</p>
        </div>
      )}
    </Card>
  );
}

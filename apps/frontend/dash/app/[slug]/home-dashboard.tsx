"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { HomeTaskItem, Task } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { useSocket } from "@/providers/socket.provider";
import { useWorkspaceHome, homeKeys } from "@/hooks/use-workspace-home";
import * as boardService from "@/services/board.service";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeMyFocusSection } from "@/components/home/HomeMyFocusSection";
import { HomeActiveProjectsSection } from "@/components/home/HomeActiveProjectsSection";
import { HomePinnedModulesSection } from "@/components/home/HomePinnedModulesSection";
import { HomeActivityStreamSection } from "@/components/home/HomeActivityStreamSection";
import { HomeVelocityCard } from "@/components/home/HomeVelocityCard";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";

const TaskDetailModal = dynamic(
  () => import("@/components/kanban/TaskDetailModal").then((mod) => mod.TaskDetailModal),
  { ssr: false }
);

export function HomeDashboard({ slug }: { slug: string }) {
  const { activeId } = useWorkspace();
  const workspaceId = activeId || "";
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [activeTask, setActiveTask] = useState<HomeTaskItem | null>(null);

  const { data, isLoading } = useWorkspaceHome(workspaceId);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    const onWorkspaceUpdate = () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.all });
    };

    socket.on("board:task:created", onWorkspaceUpdate);
    socket.on("board:task:updated", onWorkspaceUpdate);
    socket.on("board:task:moved", onWorkspaceUpdate);
    socket.on("board:task:deleted", onWorkspaceUpdate);
    socket.on("status:update", onWorkspaceUpdate);

    return () => {
      socket.off("board:task:created", onWorkspaceUpdate);
      socket.off("board:task:updated", onWorkspaceUpdate);
      socket.off("board:task:moved", onWorkspaceUpdate);
      socket.off("board:task:deleted", onWorkspaceUpdate);
      socket.off("status:update", onWorkspaceUpdate);
    };
  }, [socket, workspaceId, queryClient]);

  const handleToggleComplete = useCallback(
    async (task: HomeTaskItem, completed?: boolean) => {
      if (!workspaceId || !task.boardId) return;
      await boardService.updateTask(workspaceId, task.boardId, task.id, {
        completed_at: completed === false ? null : new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: homeKeys.all });
    },
    [workspaceId, queryClient]
  );

  const handleReschedule = useCallback(
    async (task: HomeTaskItem, newDueDate: string | null) => {
      if (!workspaceId || !task.boardId) return;
      await boardService.updateTask(workspaceId, task.boardId, task.id, {
        due_date: newDueDate,
      });
      await queryClient.invalidateQueries({ queryKey: homeKeys.all });
    },
    [workspaceId, queryClient]
  );

  if (isLoading || !workspaceId) {
    return <HomeSkeleton />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <HomeHeader summary={data?.summary} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 @container">
        <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-6 max-w-[1600px] mx-auto items-start">
          <div className="@5xl:col-span-8 flex flex-col gap-6 min-w-0">
            <HomeMyFocusSection
              focus={data?.myFocus}
              slug={slug}
              onSelectTask={setActiveTask}
              onToggleComplete={handleToggleComplete}
              onReschedule={handleReschedule}
            />
            <div className="flex flex-col gap-6 @5xl:hidden">
              <HomeActivityStreamSection activity={data?.recentActivity} slug={slug} />
              <HomeVelocityCard summary={data?.summary} />
            </div>
            <HomeActiveProjectsSection projects={data?.projects} slug={slug} />
            <HomePinnedModulesSection
              modules={data?.pinnedModules}
              slug={slug}
            />
          </div>

          <div className="hidden @5xl:flex @5xl:col-span-4 flex-col gap-6 min-w-0">
            <HomeActivityStreamSection activity={data?.recentActivity} slug={slug} />
            <HomeVelocityCard summary={data?.summary} />
          </div>
        </div>
      </div>

      {activeTask && (
        <TaskDetailModal
          task={activeTask as unknown as Task}
          workspaceId={workspaceId}
          boardId={activeTask.boardId}
          onClose={() => {
            setActiveTask(null);
            queryClient.invalidateQueries({ queryKey: homeKeys.all });
          }}
        />
      )}
    </div>
  );
}

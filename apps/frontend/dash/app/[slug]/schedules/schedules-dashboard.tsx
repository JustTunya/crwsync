"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { startOfToday, startOfDay } from "date-fns";
import type {
  ScheduleScope,
  ScheduleTask,
  TaskPriorityEnum,
  UpdateTaskPayload,
} from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { useSocket } from "@/providers/socket.provider";
import { useSchedules, scheduleKeys } from "@/hooks/use-schedules";
import * as boardService from "@/services/board.service";
import { SchedulesHeader } from "@/components/schedules/SchedulesHeader";
import { SchedulesAgenda } from "@/components/schedules/SchedulesAgenda";
import { SchedulesCalendarSidebar } from "@/components/schedules/SchedulesCalendarSidebar";
import { SchedulesSkeleton } from "@/components/schedules/SchedulesSkeleton";
import { LSidebarToggle } from "@/components/l-sidebar";
import { RSidebarToggle } from "@/components/r-sidebar";

const TaskDetailModal = dynamic(
  () =>
    import("@/components/kanban/TaskDetailModal").then(
      (mod) => mod.TaskDetailModal
    ),
  { ssr: false }
);

export function SchedulesDashboard() {
  const { activeId } = useWorkspace();
  const workspaceId = activeId || "";
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [scope, setScope] = useState<ScheduleScope>("assigned_to_me");
  const [priority, setPriority] = useState<TaskPriorityEnum | undefined>(
    undefined
  );
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [activeTask, setActiveTask] = useState<ScheduleTask | null>(null);
  const [isReschedulingOverdue, setIsReschedulingOverdue] =
    useState<boolean>(false);

  const { data, isLoading } = useSchedules(workspaceId, {
    scope,
    priority,
    includeCompleted: showCompleted,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      boardId,
      taskId,
      updateData,
    }: {
      boardId: string;
      taskId: string;
      updateData: UpdateTaskPayload;
    }) => boardService.updateTask(workspaceId, boardId, taskId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });

  const handleUpdateDueDate = useCallback(
    async (task: ScheduleTask, newDueDate: string | null) => {
      const boardId = task.board?.id || task.column?.board_id;
      if (!workspaceId || !boardId) return;
      await updateTaskMutation.mutateAsync({
        boardId,
        taskId: task.id,
        updateData: { due_date: newDueDate },
      });
    },
    [workspaceId, updateTaskMutation]
  );

  const handleToggleComplete = useCallback(
    async (task: ScheduleTask, completed: boolean) => {
      const boardId = task.board?.id || task.column?.board_id;
      if (!workspaceId || !boardId) return;
      await updateTaskMutation.mutateAsync({
        boardId,
        taskId: task.id,
        updateData: { completed_at: completed ? new Date().toISOString() : null },
      });
    },
    [workspaceId, updateTaskMutation]
  );

  const handleRescheduleOverdueToToday = useCallback(async () => {
    if (!workspaceId || !data?.tasks) return;
    const today = startOfToday();
    const overdueTasks = data.tasks.filter((task) => {
      if (!task.due_date) return false;
      const isCompleted =
        task.column?.type === "COMPLETE" || !!task.completed_at;
      return !isCompleted && startOfDay(new Date(task.due_date)) < today;
    });

    if (overdueTasks.length === 0) return;

    setIsReschedulingOverdue(true);
    try {
      const todayIso = new Date().toISOString();
      await Promise.all(
        overdueTasks.map((task) => {
          const boardId = task.board?.id || task.column?.board_id;
          if (!boardId) return Promise.resolve();
          return boardService.updateTask(workspaceId, boardId, task.id, {
            due_date: todayIso,
          });
        })
      );
      await queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    } finally {
      setIsReschedulingOverdue(false);
    }
  }, [workspaceId, data?.tasks, queryClient]);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    const onTaskChange = () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    };

    socket.on("board:task:created", onTaskChange);
    socket.on("board:task:updated", onTaskChange);
    socket.on("board:task:moved", onTaskChange);
    socket.on("board:task:deleted", onTaskChange);

    return () => {
      socket.off("board:task:created", onTaskChange);
      socket.off("board:task:updated", onTaskChange);
      socket.off("board:task:moved", onTaskChange);
      socket.off("board:task:deleted", onTaskChange);
    };
  }, [socket, workspaceId, queryClient]);

  if (isLoading || !workspaceId) {
    return <SchedulesSkeleton />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-3 h-16 px-4 border-b border-base-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <LSidebarToggle />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Schedules</h1>
            <p className="text-sm text-muted-foreground leading-4 font-mono">
              Upcoming deadlines
            </p>
          </div>
        </div>
        <RSidebarToggle />
      </header>

      <SchedulesHeader
        scope={scope}
        onScopeChange={setScope}
        priority={priority}
        onPriorityChange={setPriority}
        counts={data?.counts}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 @container">
        <div className="flex flex-col @4xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full @container">
            <SchedulesAgenda
              tasks={data?.tasks}
              selectedDate={selectedDate}
              onTaskClick={(task) => setActiveTask(task)}
              onToggleComplete={handleToggleComplete}
              onReschedule={handleUpdateDueDate}
            />
          </div>

          <SchedulesCalendarSidebar
            tasks={data?.tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            counts={data?.counts}
            onRescheduleOverdue={handleRescheduleOverdueToToday}
            isReschedulingOverdue={isReschedulingOverdue}
            showCompleted={showCompleted}
            onToggleShowCompleted={setShowCompleted}
          />
        </div>
      </div>

      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          workspaceId={workspaceId}
          boardId={activeTask.board?.id || activeTask.column?.board_id || ""}
          onClose={() => {
            setActiveTask(null);
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
          }}
        />
      )}
    </div>
  );
}

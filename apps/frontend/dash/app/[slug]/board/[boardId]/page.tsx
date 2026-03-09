"use client";

import { useReducer, useCallback } from "react";
import { useParams } from "next/navigation";
import { SortableContext } from "@dnd-kit/sortable";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import type { Task, BoardColumn } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { KanbanCol, KanbanTaskOverlay, TaskDetailModal } from "@/components/kanban";
import { useBoard, useCreateColumn, useCreateTask, useMoveTask } from "@/hooks/use-boards";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { useMediaQuery } from "@/hooks/use-media-query";

interface BoardPageState {
  addingTaskFor: string | null;
  editingTask: Task | null;
  activeTask: Task | null;
  addingColumn: boolean;
  columnName: string;
  taskTitle: string;
}

type BoardPageAction =
  | { type: "SET_ADDING_TASK_FOR"; payload: string | null }
  | { type: "SET_EDITING_TASK"; payload: Task | null }
  | { type: "SET_ACTIVE_TASK"; payload: Task | null }
  | { type: "SET_ADDING_COLUMN"; payload: boolean }
  | { type: "SET_COLUMN_NAME"; payload: string }
  | { type: "SET_TASK_TITLE"; payload: string }
  | { type: "RESET_COLUMN_INPUT" }
  | { type: "RESET_TASK_INPUT" };

const initialState: BoardPageState = {
  addingTaskFor: null,
  editingTask: null,
  activeTask: null,
  addingColumn: false,
  columnName: "",
  taskTitle: "",
};

function boardReducer(state: BoardPageState, action: BoardPageAction): BoardPageState {
  switch (action.type) {
    case "SET_ADDING_TASK_FOR":
      return { ...state, addingTaskFor: action.payload };
    case "SET_EDITING_TASK":
      return { ...state, editingTask: action.payload };
    case "SET_ACTIVE_TASK":
      return { ...state, activeTask: action.payload };
    case "SET_ADDING_COLUMN":
      return { ...state, addingColumn: action.payload };
    case "SET_COLUMN_NAME":
      return { ...state, columnName: action.payload };
    case "SET_TASK_TITLE":
      return { ...state, taskTitle: action.payload };
    case "RESET_COLUMN_INPUT":
      return { ...state, addingColumn: false, columnName: "" };
    case "RESET_TASK_INPUT":
      return { ...state, addingTaskFor: null, taskTitle: "" };
    default:
      return state;
  }
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();

  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id || "";

  const isMobile = useMediaQuery("(max-width: 768px)");

  const { data: board, isLoading } = useBoard(workspaceId, boardId);
  const createColumn = useCreateColumn(workspaceId, boardId);
  const createTask = useCreateTask(workspaceId, boardId);
  const moveTask = useMoveTask(workspaceId, boardId);

  const [state, dispatch] = useReducer(boardReducer, initialState);
  const { addingTaskFor, editingTask, activeTask, addingColumn, columnName, taskTitle } = state;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleCreateColumn = async () => {
    if (!columnName.trim()) return;
    await createColumn.mutateAsync({ name: columnName.trim() });
    dispatch({ type: "RESET_COLUMN_INPUT" });
  };

  const handleCreateTask = async (columnId: string) => {
    if (!taskTitle.trim()) return;
    await createTask.mutateAsync({
      title: taskTitle.trim(),
      column_id: columnId,
    });
    dispatch({ type: "RESET_TASK_INPUT" });
  };

  const findColumnByTaskId = useCallback(
    (taskId: string): BoardColumn | undefined => {
      return board?.columns?.find((col) =>
        col.tasks?.some((t) => t.id === taskId),
      );
    },
    [board],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as Task | undefined;
    if (task) dispatch({ type: "SET_ACTIVE_TASK", payload: task });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    dispatch({ type: "SET_ACTIVE_TASK", payload: null });

    if (!over || !board?.columns || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceColumn = findColumnByTaskId(activeId);
    if (!sourceColumn) return;

    const isColumnDrop = overId.startsWith("column-"); // Eather column or another task
    const targetColumnId = isColumnDrop
      ? overId.replace("column-", "")
      : findColumnByTaskId(overId)?.id;

    const targetColumn = board.columns.find((c) => c.id === targetColumnId);
    if (!targetColumnId || !targetColumn) return;

    const getTargetIndex = (): number => {
      const tasks = targetColumn.tasks ?? [];

      if (isColumnDrop) return tasks.length;

      const overIndex = tasks.findIndex((t) => t.id === overId);
      return overIndex !== -1 ? overIndex : tasks.length;
    };

    moveTask.mutate({
      taskId: activeId,
      data: { column_id: targetColumnId, position: getTargetIndex() },
    });
  };

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="size-full flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-2">Board Not Found</h1>
        <p className="text-muted-foreground">
          This board doesn&apos;t exist or you don&apos;t have access.
        </p>
      </div>
    );
  }

  const allSortableIds = [
    ...(board.columns?.flatMap((col) => [
      `column-${col.id}`,
      ...(col.tasks?.map((t) => t.id) || []),
    ]) || []),
  ];

  return (
    <div className="size-full flex flex-col">
      <div className="flex items-center justify-between h-16 pl-16 pr-24 border-b border-base-200">
        <div className="w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">{board.name}</h1>
        </div>
        {isMobile ? (
          <button
            onClick={() => dispatch({ type: "SET_ADDING_COLUMN", payload: true })}
            className="flex items-center gap-1 bg-foreground text-background p-1.5 rounded-full text-sm font-semibold cursor-pointer"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => dispatch({ type: "SET_ADDING_COLUMN", payload: true })}
            className="flex items-center gap-1 bg-foreground text-background px-2 py-1 rounded-md text-sm font-semibold cursor-pointer"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            Add Column
          </button>
        )}
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allSortableIds}>
            <div className="flex gap-4 h-full">
              {board.columns?.map((column) => (
                <KanbanCol
                  key={column.id}
                  column={column}
                  taskIds={column.tasks?.map((t) => t.id) || []}
                  workspaceId={workspaceId}
                  boardId={boardId}
                  taskTitle={taskTitle}
                  setTaskTitle={(v) => dispatch({ type: "SET_TASK_TITLE", payload: v })}
                  addingTask={addingTaskFor === column.id}
                  onCreateTask={() => handleCreateTask(column.id)}
                  onCancelTask={() => dispatch({ type: "SET_ADDING_TASK_FOR", payload: null })}
                  onTaskClick={(task) => dispatch({ type: "SET_EDITING_TASK", payload: task })}
                  onAddTask={() => {
                    dispatch({ type: "SET_ADDING_TASK_FOR", payload: column.id });
                    dispatch({ type: "SET_TASK_TITLE", payload: "" });
                  }}
                />
              ))}

              {addingColumn && (
                <div className="flex flex-col shrink-0 w-72 bg-base-200/50 rounded-xl p-3 border-[1.5px] border-primary ring-3 ring-primary/50">
                  <input
                    ref={(input) => {
                      if (input && addingColumn) input.focus();
                    }}
                    type="text"
                    value={columnName}
                    onChange={(e) => dispatch({ type: "SET_COLUMN_NAME", payload: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateColumn();
                      if (e.key === "Escape") {
                        dispatch({ type: "RESET_COLUMN_INPUT" });
                      }
                    }}
                    onBlur={() => {
                      if (!columnName.trim()) {
                        dispatch({ type: "RESET_COLUMN_INPUT" });
                      }
                    }}
                    placeholder="Column name..."
                    className="text-sm font-medium bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeTask && <KanbanTaskOverlay task={activeTask} />}
          </DragOverlay>
        </DndContext>
      </div>


      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          workspaceId={workspaceId}
          boardId={boardId}
          onClose={() => dispatch({ type: "SET_EDITING_TASK", payload: null })}
        />
      )}
    </div>
  );
}

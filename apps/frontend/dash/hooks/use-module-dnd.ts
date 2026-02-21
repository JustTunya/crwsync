import { useState } from "react";
import { useSensor, useSensors, PointerSensor, KeyboardSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { WorkspaceModule } from "@crwsync/types";
import { useReorderModules } from "@/hooks/use-workspace-modules";

export function useModuleDnd(
  localModules: WorkspaceModule[] | undefined,
  setLocalModules: (modules: WorkspaceModule[]) => void,
  activeWorkspaceId: string | undefined,
  reorderModules: ReturnType<typeof useReorderModules>
) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id && localModules) {
      const oldIndex = localModules.findIndex((m) => m.id === active.id);
      const newIndex = localModules.findIndex((m) => m.id === over.id);

      const newOrder = arrayMove(localModules, oldIndex, newIndex);
      setLocalModules(newOrder);

      if (activeWorkspaceId) reorderModules.mutate({ module_ids: newOrder.map((m) => m.id) });
    }
  };

  return { activeId, sensors, handleDragStart, handleDragEnd };
}

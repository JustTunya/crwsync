import { useState } from "react";
import { useSensor, useSensors, PointerSensor, KeyboardSensor, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localModules) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeIndex = localModules.findIndex((m) => m.id === activeId);
    if (activeIndex === -1) return;
    
    const activeModule = localModules[activeIndex];

    const overModule = localModules.find((m) => m.id === overId);
    let newProjectId: string | null = null;

    if (overModule) {
      newProjectId = overModule.project_id;
    } else {
      newProjectId = overId === "shared" ? null : String(overId);
    }

    if (activeModule.project_id !== newProjectId) {
      const newModules = [...localModules];
      newModules[activeIndex] = { ...activeModule, project_id: newProjectId };
      setLocalModules(newModules);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && localModules) {
      const activeIndex = localModules.findIndex((m) => m.id === active.id);
      
      let overIndex = localModules.findIndex((m) => m.id === over.id);
      
      if (overIndex === -1) {
        const newProjectId = over.id === "shared" ? null : String(over.id);
        const siblings = localModules.filter((m) => m.project_id === newProjectId);
        if (siblings.length > 0) {
          overIndex = localModules.findIndex((m) => m.id === siblings[siblings.length - 1].id);
        } else {
          overIndex = activeIndex;
        }
      }

      let newOrder = localModules;
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        newOrder = arrayMove(localModules, activeIndex, overIndex);
        setLocalModules(newOrder);
      }

      if (activeWorkspaceId) {
        const updates = newOrder.map((m, index) => ({
          id: m.id,
          project_id: m.project_id,
          position: index + 1,
        }));
        reorderModules.mutate({ updates });
      }
    }
  };

  return { activeId, sensors, handleDragStart, handleDragOver, handleDragEnd };
}

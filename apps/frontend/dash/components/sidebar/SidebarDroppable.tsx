import { useDroppable } from "@dnd-kit/core";

export function SidebarDroppable({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className} data-testid={`sidebar-droppable-${id}`}>
      {children}
    </div>
  );
}

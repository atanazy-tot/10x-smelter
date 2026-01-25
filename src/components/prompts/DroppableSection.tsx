/**
 * Droppable wrapper for sections using dnd-kit.
 */

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableSectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableSection({ id, children, className }: DroppableSectionProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("transition-colors duration-200", isOver && "bg-main/10 ring-2 ring-main ring-inset", className)}
    >
      {children}
    </div>
  );
}

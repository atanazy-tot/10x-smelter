/**
 * Draggable wrapper for PromptItem using dnd-kit.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptItem } from "./PromptItem";
import type { PromptDTO } from "@/types";

interface DraggablePromptItemProps {
  prompt: PromptDTO;
  className?: string;
}

export function DraggablePromptItem({ prompt, className }: DraggablePromptItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prompt.id,
    data: { prompt },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative flex items-stretch", isDragging && "opacity-50", className)}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        className={cn(
          "flex items-center justify-center px-2 border-2 border-r-0 border-border bg-background text-foreground/40 hover:text-foreground hover:bg-foreground/5 cursor-grab active:cursor-grabbing transition-colors",
          isDragging && "cursor-grabbing"
        )}
        aria-label={`Drag ${prompt.title}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Prompt item */}
      <div className="flex-1">
        <PromptItem prompt={prompt} />
      </div>
    </div>
  );
}

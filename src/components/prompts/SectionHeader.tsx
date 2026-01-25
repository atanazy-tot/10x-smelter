/**
 * Section header with title, edit, and delete buttons.
 */

import { Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import type { PromptSectionWithCountDTO } from "@/types";

interface SectionHeaderProps {
  section: PromptSectionWithCountDTO;
  className?: string;
}

export function SectionHeader({ section, className }: SectionHeaderProps) {
  const setEditingSection = usePromptStore((state) => state.setEditingSection);
  const deleteSection = usePromptStore((state) => state.deleteSection);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSection(section);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete section "${section.title}"? Prompts will be moved to UNSORTED.`)) {
      try {
        await deleteSection(section.id);
      } catch (error) {
        console.error("Failed to delete section:", error);
      }
    }
  };

  return (
    <div className={cn("flex items-center justify-between w-full group", className)}>
      <span className="flex items-center gap-2">
        {section.title}
        <span className="text-xs opacity-60">({section.prompt_count})</span>
      </span>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleEdit}
          className="p-1 hover:bg-foreground/10 rounded"
          aria-label={`Edit ${section.title}`}
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="p-1 hover:bg-neo-coral/20 rounded text-neo-coral"
          aria-label={`Delete ${section.title}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

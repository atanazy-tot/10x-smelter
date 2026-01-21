/**
 * Individual custom prompt button in the sidebar.
 */

import { Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import type { PromptDTO } from "@/types";

interface PromptItemProps {
  prompt: PromptDTO;
  className?: string;
}

export function PromptItem({ prompt, className }: PromptItemProps) {
  const selectedCustomPromptId = usePromptStore((state) => state.selectedCustomPromptId);
  const selectCustomPrompt = usePromptStore((state) => state.selectCustomPrompt);
  const setEditingPrompt = usePromptStore((state) => state.setEditingPrompt);
  const deletePrompt = usePromptStore((state) => state.deletePrompt);

  const isSelected = selectedCustomPromptId === prompt.id;

  const handleSelect = () => {
    selectCustomPrompt(isSelected ? null : prompt.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${prompt.title}"?`)) {
      try {
        await deletePrompt(prompt.id);
      } catch (error) {
        console.error("Failed to delete prompt:", error);
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleSelect();
        }
      }}
      className={cn(
        "group flex items-center justify-between p-3 border-2 border-border cursor-pointer transition-all",
        isSelected
          ? "bg-main text-main-foreground shadow-[2px_2px_0px_0px_var(--shadow)]"
          : "bg-background text-foreground hover:bg-foreground/5",
        className
      )}
    >
      <span className="font-mono text-sm uppercase truncate pr-2">{prompt.title}</span>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleEdit}
          className="p-1 hover:bg-foreground/10 rounded"
          aria-label={`Edit ${prompt.title}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="p-1 hover:bg-neo-coral/20 rounded text-neo-coral"
          aria-label={`Delete ${prompt.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

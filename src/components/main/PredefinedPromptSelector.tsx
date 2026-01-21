/**
 * Horizontal row of 5 predefined prompt buttons with multi-select.
 */

import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import type { DefaultPromptName } from "@/types";

interface PredefinedPromptSelectorProps {
  className?: string;
}

interface PromptOption {
  name: DefaultPromptName;
  label: string;
}

const PREDEFINED_PROMPTS: PromptOption[] = [
  { name: "summarize", label: "SUMMARIZE" },
  { name: "action_items", label: "ACTION ITEMS" },
  { name: "detailed_notes", label: "DETAILED NOTES" },
  { name: "qa_format", label: "Q&A FORMAT" },
  { name: "table_of_contents", label: "TABLE OF CONTENTS" },
];

export function PredefinedPromptSelector({ className }: PredefinedPromptSelectorProps) {
  const selectedPredefinedPrompts = usePromptStore((state) => state.selectedPredefinedPrompts);
  const togglePredefinedPrompt = usePromptStore((state) => state.togglePredefinedPrompt);
  const selectedCustomPromptId = usePromptStore((state) => state.selectedCustomPromptId);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-xs font-mono uppercase text-foreground/60 tracking-wider">SELECT PROMPT</p>

      <div className="flex flex-wrap gap-2">
        {PREDEFINED_PROMPTS.map((prompt) => {
          const isSelected = selectedPredefinedPrompts.includes(prompt.name);
          const hasCustomSelected = selectedCustomPromptId !== null;

          return (
            <button
              key={prompt.name}
              type="button"
              onClick={() => togglePredefinedPrompt(prompt.name)}
              className={cn(
                "py-2 px-3 font-mono text-xs uppercase tracking-wider transition-all border-2 border-border",
                isSelected
                  ? "bg-main text-main-foreground shadow-[2px_2px_0px_0px_var(--shadow)]"
                  : hasCustomSelected
                    ? "bg-background/50 text-foreground/40"
                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
              )}
            >
              {prompt.label}
            </button>
          );
        })}
      </div>

      {selectedPredefinedPrompts.length > 1 && (
        <p className="text-xs font-mono text-foreground/40">{selectedPredefinedPrompts.length} PROMPTS SELECTED</p>
      )}
    </div>
  );
}

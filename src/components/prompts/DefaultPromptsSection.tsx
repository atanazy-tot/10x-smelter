/**
 * Accordion section for default prompts with multi-select behavior.
 * Displays prompts in a vertical list format with checkboxes.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import type { DefaultPromptName } from "@/types";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface DefaultPromptsSectionProps {
  className?: string;
}

interface PromptOption {
  name: DefaultPromptName;
  label: string;
}

const DEFAULT_PROMPTS: PromptOption[] = [
  { name: "summarize", label: "SUMMARIZE" },
  { name: "action_items", label: "ACTION ITEMS" },
  { name: "detailed_notes", label: "DETAILED NOTES" },
  { name: "qa_format", label: "Q&A FORMAT" },
  { name: "table_of_contents", label: "TABLE OF CONTENTS" },
];

export function DefaultPromptsSection({ className }: DefaultPromptsSectionProps) {
  const selectedPredefinedPrompts = usePromptStore((state) => state.selectedPredefinedPrompts);
  const togglePredefinedPrompt = usePromptStore((state) => state.togglePredefinedPrompt);
  const selectedCustomPromptId = usePromptStore((state) => state.selectedCustomPromptId);

  const selectedCount = selectedPredefinedPrompts.length;
  const hasCustomSelected = selectedCustomPromptId !== null;

  return (
    <Accordion type="multiple" defaultValue={["default-prompts"]} className={cn("flex flex-col gap-2", className)}>
      <AccordionItem value="default-prompts">
        <AccordionTrigger className="font-mono text-sm uppercase">
          <span className="flex items-center gap-2">
            DEFAULT PROMPTS
            {selectedCount > 0 && <span className="text-xs opacity-60">({selectedCount} SELECTED)</span>}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2">
            {DEFAULT_PROMPTS.map((prompt) => {
              const isSelected = selectedPredefinedPrompts.includes(prompt.name);

              return (
                <div
                  key={prompt.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => togglePredefinedPrompt(prompt.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      togglePredefinedPrompt(prompt.name);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 border-2 border-border cursor-pointer transition-all",
                    isSelected
                      ? "bg-main text-main-foreground shadow-[2px_2px_0px_0px_var(--shadow)]"
                      : hasCustomSelected
                        ? "bg-background/50 text-foreground/40"
                        : "bg-background text-foreground hover:bg-foreground/5"
                  )}
                >
                  <span className="font-mono text-sm uppercase">{prompt.label}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

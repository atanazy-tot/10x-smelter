/**
 * Expandable section in the prompt sidebar.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import { PromptItem } from "./PromptItem";
import type { PromptSectionWithCountDTO } from "@/types";

interface SectionAccordionProps {
  section: PromptSectionWithCountDTO;
  className?: string;
}

export function SectionAccordion({ section, className }: SectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const customPrompts = usePromptStore((state) => state.customPrompts);

  const sectionPrompts = customPrompts.filter((p) => p.section_id === section.id);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Section header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 bg-neo-black text-neo-white font-mono text-sm uppercase tracking-wider hover:bg-neo-black/90 transition-colors"
      >
        <span className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {section.title}
        </span>
        <span className="text-neo-white/60">{section.prompt_count}</span>
      </button>

      {/* Prompts list */}
      {isOpen && sectionPrompts.length > 0 && (
        <div className="flex flex-col gap-1 p-2 bg-neo-white/50">
          {sectionPrompts.map((prompt) => (
            <PromptItem key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}

      {isOpen && sectionPrompts.length === 0 && (
        <div className="p-4 bg-neo-white/50">
          <p className="font-mono text-xs text-neo-black/40 uppercase text-center">NO PROMPTS YET</p>
        </div>
      )}
    </div>
  );
}

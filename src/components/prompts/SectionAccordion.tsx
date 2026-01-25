/**
 * Expandable section for prompt sections.
 * Uses neobrutalist Accordion components.
 */

import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { PromptItem } from "./PromptItem";
import type { PromptSectionWithCountDTO } from "@/types";

interface SectionAccordionProps {
  section: PromptSectionWithCountDTO;
  className?: string;
}

export function SectionAccordion({ section, className }: SectionAccordionProps) {
  const customPrompts = usePromptStore((state) => state.customPrompts);
  const sectionPrompts = customPrompts.filter((p) => p.section_id === section.id);

  return (
    <AccordionItem value={section.id} className={cn(className)}>
      <AccordionTrigger className="font-mono text-sm uppercase">
        <span className="flex items-center gap-2">
          {section.title}
          <span className="text-xs opacity-60">({section.prompt_count})</span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {sectionPrompts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sectionPrompts.map((prompt) => (
              <PromptItem key={prompt.id} prompt={prompt} />
            ))}
          </div>
        ) : (
          <p className="font-mono text-xs text-foreground/40 uppercase text-center py-2">NO PROMPTS IN THIS SECTION</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

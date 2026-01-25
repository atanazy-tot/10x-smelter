/**
 * Accordion for user-created sections with edit/delete capabilities.
 * Supports drag-and-drop for moving prompts between sections.
 */

import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DraggablePromptItem } from "./DraggablePromptItem";
import { DroppableSection } from "./DroppableSection";
import { SectionHeader } from "./SectionHeader";

interface UserSectionsAccordionProps {
  className?: string;
}

export function UserSectionsAccordion({ className }: UserSectionsAccordionProps) {
  const sections = usePromptStore((state) => state.sections);
  const customPrompts = usePromptStore((state) => state.customPrompts);

  if (sections.length === 0) {
    return null;
  }

  return (
    <Accordion type="multiple" className={cn("flex flex-col gap-2", className)}>
      {sections.map((section) => {
        const sectionPrompts = customPrompts.filter((p) => p.section_id === section.id);

        return (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="font-mono text-sm uppercase">
              <SectionHeader section={section} />
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <DroppableSection id={section.id} className="p-4">
                {sectionPrompts.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {sectionPrompts.map((prompt) => (
                      <DraggablePromptItem key={prompt.id} prompt={prompt} />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 border-2 border-dashed border-border/50 text-center">
                    <p className="font-mono text-xs text-foreground/30 uppercase">DROP PROMPTS HERE</p>
                  </div>
                )}
              </DroppableSection>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

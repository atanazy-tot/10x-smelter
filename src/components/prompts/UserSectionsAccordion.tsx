/**
 * Accordion for user-created sections with edit/delete capabilities.
 */

import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { PromptItem } from "./PromptItem";
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
            <AccordionContent>
              {sectionPrompts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {sectionPrompts.map((prompt) => (
                    <PromptItem key={prompt.id} prompt={prompt} />
                  ))}
                </div>
              ) : (
                <p className="font-mono text-xs text-foreground/40 uppercase text-center py-2">
                  NO PROMPTS IN THIS SECTION
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

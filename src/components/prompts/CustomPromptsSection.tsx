/**
 * Collapsible section for custom prompts in the main controls area.
 * Shows "MY PROMPTS" header with prompt count, expandable accordion sections.
 * Only renders for authenticated users.
 */

import { useEffect } from "react";
import { ChevronDown, Plus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore, useAuthStore } from "@/store";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { PromptItem } from "./PromptItem";

interface CustomPromptsSectionProps {
  className?: string;
}

export function CustomPromptsSection({ className }: CustomPromptsSectionProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const sections = usePromptStore((state) => state.sections);
  const customPrompts = usePromptStore((state) => state.customPrompts);
  const isLoading = usePromptStore((state) => state.isLoading);
  const loadPrompts = usePromptStore((state) => state.loadPrompts);
  const loadSections = usePromptStore((state) => state.loadSections);
  const setEditorOpen = usePromptStore((state) => state.setEditorOpen);

  // Load prompts and sections when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPrompts();
      loadSections();
    }
  }, [isAuthenticated, loadPrompts, loadSections]);

  // Don't render for anonymous users
  if (!isAuthenticated) {
    return null;
  }

  // Get unsectioned prompts
  const unsectionedPrompts = customPrompts.filter((p) => p.section_id === null);
  const totalPromptCount = customPrompts.length;
  const hasPrompts = totalPromptCount > 0 || sections.length > 0;

  return (
    <Collapsible className={cn("flex flex-col", className)}>
      {/* Trigger - MY PROMPTS header */}
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-foreground text-background font-mono text-sm uppercase tracking-wider hover:bg-foreground/90 transition-colors border-2 border-border">
        <span className="flex items-center gap-2">
          MY PROMPTS
          {totalPromptCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-background text-foreground rounded-sm">{totalPromptCount}</span>
          )}
        </span>
        <ChevronDown className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent className="border-2 border-t-0 border-border bg-background">
        {/* NEW PROMPT button */}
        <div className="p-4 border-b-2 border-border">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 font-mono text-sm uppercase tracking-wider border-2 border-border bg-main text-main-foreground hover:bg-foreground hover:text-main transition-colors shadow-[2px_2px_0px_0px_var(--shadow)]"
          >
            <Plus className="w-4 h-4" />
            NEW PROMPT
          </button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="p-4">
            <p className="font-mono text-sm text-foreground/40 uppercase text-center">LOADING...</p>
          </div>
        ) : hasPrompts ? (
          <div className="p-4 flex flex-col gap-4">
            {/* Sections as accordion */}
            {sections.length > 0 && (
              <Accordion type="multiple" className="flex flex-col gap-2">
                {sections.map((section) => {
                  const sectionPrompts = customPrompts.filter((p) => p.section_id === section.id);
                  return (
                    <AccordionItem key={section.id} value={section.id}>
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
                          <p className="font-mono text-xs text-foreground/40 uppercase text-center py-2">
                            NO PROMPTS IN THIS SECTION
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}

            {/* Unsectioned prompts */}
            {unsectionedPrompts.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="py-2 font-mono text-xs uppercase tracking-wider text-foreground/60">UNSORTED</div>
                {unsectionedPrompts.map((prompt) => (
                  <PromptItem key={prompt.id} prompt={prompt} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="p-8 text-center">
            <FolderPlus className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
            <p className="font-mono text-sm text-foreground/40 uppercase">NO CUSTOM PROMPTS YET</p>
            <p className="font-mono text-xs text-foreground/30 mt-2">CREATE ONE TO GET STARTED</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

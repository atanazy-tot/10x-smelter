/**
 * Unified prompts section that combines default prompts and custom prompts
 * with section management. Card wrapper with neobrutalist styling.
 */

import { useEffect } from "react";
import { ChevronDown, Plus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore, useAuthStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { DefaultPromptsSection } from "./DefaultPromptsSection";
import { UserSectionsAccordion } from "./UserSectionsAccordion";
import { PromptItem } from "./PromptItem";
import { SectionDialog } from "./SectionDialog";
import { PromptEditor } from "./PromptEditor";

interface UnifiedPromptsSectionProps {
  className?: string;
}

export function UnifiedPromptsSection({ className }: UnifiedPromptsSectionProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const sections = usePromptStore((state) => state.sections);
  const customPrompts = usePromptStore((state) => state.customPrompts);
  const isLoading = usePromptStore((state) => state.isLoading);
  const loadPrompts = usePromptStore((state) => state.loadPrompts);
  const loadSections = usePromptStore((state) => state.loadSections);
  const setEditorOpen = usePromptStore((state) => state.setEditorOpen);
  const setSectionDialogOpen = usePromptStore((state) => state.setSectionDialogOpen);
  const selectedPredefinedPrompts = usePromptStore((state) => state.selectedPredefinedPrompts);

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
  const totalCustomPromptCount = customPrompts.length;
  const totalSelectedCount = selectedPredefinedPrompts.length;
  const totalCount = totalCustomPromptCount + 5; // 5 default prompts

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <Collapsible defaultOpen>
          {/* Header - PROMPTS with total count */}
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-foreground text-background font-mono text-sm uppercase tracking-wider hover:bg-foreground/90 transition-colors">
            <span className="flex items-center gap-2">
              PROMPTS
              <span className="px-2 py-0.5 text-xs bg-background text-foreground rounded-sm">{totalCount}</span>
              {totalSelectedCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-main text-main-foreground rounded-sm">
                  {totalSelectedCount} SELECTED
                </span>
              )}
            </span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>

          <CollapsibleContent className="border-t-0">
            {/* Action buttons */}
            <div className="p-4 border-b-2 border-border flex gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 font-mono text-sm uppercase tracking-wider border-2 border-border bg-main text-main-foreground hover:bg-foreground hover:text-main transition-colors shadow-[2px_2px_0px_0px_var(--shadow)]"
              >
                <Plus className="w-4 h-4" />
                NEW PROMPT
              </button>
              <button
                type="button"
                onClick={() => setSectionDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 font-mono text-sm uppercase tracking-wider border-2 border-border bg-background text-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                NEW SECTION
              </button>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="p-4">
                <p className="font-mono text-sm text-foreground/40 uppercase text-center">LOADING...</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                {/* Default prompts section */}
                <DefaultPromptsSection />

                {/* User sections */}
                <UserSectionsAccordion />

                {/* Unsorted prompts */}
                {unsectionedPrompts.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="py-2 font-mono text-xs uppercase tracking-wider text-foreground/60">
                      UNSORTED ({unsectionedPrompts.length})
                    </div>
                    {unsectionedPrompts.map((prompt) => (
                      <PromptItem key={prompt.id} prompt={prompt} />
                    ))}
                  </div>
                )}

                {/* Empty state for custom prompts */}
                {totalCustomPromptCount === 0 && sections.length === 0 && (
                  <div className="py-4 text-center border-t-2 border-border mt-2">
                    <FolderPlus className="w-8 h-8 mx-auto mb-2 text-foreground/20" />
                    <p className="font-mono text-xs text-foreground/40 uppercase">NO CUSTOM PROMPTS YET</p>
                    <p className="font-mono text-xs text-foreground/30 mt-1">CREATE ONE TO GET STARTED</p>
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Dialogs */}
      <SectionDialog />
      <PromptEditor />
    </>
  );
}

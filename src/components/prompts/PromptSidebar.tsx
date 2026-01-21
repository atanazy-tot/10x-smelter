/**
 * Collapsible sidebar for custom prompt library (logged-in only).
 */

import { useEffect } from "react";
import { X, Plus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore, useUIStore, useAuthStore } from "@/store";
import { SectionAccordion } from "./SectionAccordion";
import { PromptItem } from "./PromptItem";
import { PromptEditor } from "./PromptEditor";

interface PromptSidebarProps {
  className?: string;
}

export function PromptSidebar({ className }: PromptSidebarProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const sections = usePromptStore((state) => state.sections);
  const customPrompts = usePromptStore((state) => state.customPrompts);
  const isLoading = usePromptStore((state) => state.isLoading);
  const loadPrompts = usePromptStore((state) => state.loadPrompts);
  const loadSections = usePromptStore((state) => state.loadSections);
  const setEditorOpen = usePromptStore((state) => state.setEditorOpen);

  // Load prompts and sections when authenticated and sidebar opens
  useEffect(() => {
    if (isAuthenticated && sidebarOpen) {
      loadPrompts();
      loadSections();
    }
  }, [isAuthenticated, sidebarOpen, loadPrompts, loadSections]);

  // Don't render for anonymous users
  if (!isAuthenticated) {
    return null;
  }

  // Get unsectioned prompts
  const unsectionedPrompts = customPrompts.filter((p) => p.section_id === null);

  return (
    <>
      {/* Overlay backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neo-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-neo-white border-l-2 border-neo-black z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-neo-black bg-neo-black">
          <h2 className="font-mono text-lg uppercase tracking-wider text-neo-white">MY PROMPTS</h2>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-neo-white hover:text-neo-lime transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 border-b-2 border-neo-black">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 font-mono text-sm uppercase tracking-wider border-2 border-neo-black bg-neo-lime text-neo-black hover:bg-neo-black hover:text-neo-lime transition-colors"
          >
            <Plus className="w-4 h-4" />
            NEW PROMPT
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              <p className="font-mono text-sm text-neo-black/40 uppercase text-center">LOADING...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Sections */}
              {sections.map((section) => (
                <SectionAccordion key={section.id} section={section} />
              ))}

              {/* Unsectioned prompts */}
              {unsectionedPrompts.length > 0 && (
                <div className="flex flex-col">
                  <div className="p-3 bg-neo-black/10 font-mono text-sm uppercase tracking-wider text-neo-black/60">
                    UNSORTED
                  </div>
                  <div className="flex flex-col gap-1 p-2">
                    {unsectionedPrompts.map((prompt) => (
                      <PromptItem key={prompt.id} prompt={prompt} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {sections.length === 0 && unsectionedPrompts.length === 0 && (
                <div className="p-8 text-center">
                  <FolderPlus className="w-12 h-12 mx-auto mb-4 text-neo-black/20" />
                  <p className="font-mono text-sm text-neo-black/40 uppercase">NO CUSTOM PROMPTS YET</p>
                  <p className="font-mono text-xs text-neo-black/30 mt-2">CREATE ONE TO GET STARTED</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Prompt editor overlay */}
      <PromptEditor />
    </>
  );
}

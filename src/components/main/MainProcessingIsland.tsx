/**
 * Main React island for the processing page.
 * Orchestrates all input, controls, output, and sidebar components.
 */

import { useEffect } from "react";
import { useAuthStore, useProcessingStore } from "@/store";
import { useSmeltSubscription } from "@/components/hooks/useSmeltSubscription";
import { Header } from "@/components/layout/Header";
import { InputSection } from "./InputSection";
import { ControlsSection } from "./ControlsSection";
import { OutputSection } from "./OutputSection";
import { PromptSidebar } from "@/components/prompts/PromptSidebar";

export function MainProcessingIsland() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const status = useProcessingStore((state) => state.status);

  // Initialize auth and usage on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Subscribe to realtime updates when processing
  useSmeltSubscription();

  const isProcessing = status === "processing";
  const hasOutput = status === "completed" || status === "failed";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="font-mono text-lg uppercase text-foreground/40 animate-pulse">LOADING...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Title */}
            <div className="text-center">
              <h1 className="font-mono text-3xl uppercase tracking-widest text-foreground mb-2">SMELT IT</h1>
              <p className="font-mono text-sm text-foreground/60 uppercase">TRANSFORM AUDIO INTO STRUCTURED MARKDOWN</p>
            </div>

            {/* Input Section - hide when processing or has output */}
            {!isProcessing && !hasOutput && <InputSection />}

            {/* Controls Section - hide when processing or has output */}
            {!isProcessing && !hasOutput && <ControlsSection />}

            {/* Output Section - show when processing or has output */}
            {(isProcessing || hasOutput) && <OutputSection />}

            {/* Reset button when has output */}
            {hasOutput && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    useProcessingStore.getState().reset();
                  }}
                  className="py-3 px-8 font-mono text-sm uppercase tracking-wider border-2 border-border bg-background text-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  START OVER
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t-2 border-border bg-background">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <p className="font-mono text-xs text-foreground/40 uppercase">SMELT - AUDIO TO MARKDOWN</p>
          <p className="font-mono text-xs text-foreground/40 uppercase">
            POWERED BY{" "}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="hover:text-main">
              OPENROUTER
            </a>
          </p>
        </div>
      </footer>

      {/* Prompt Sidebar (logged-in only) */}
      <PromptSidebar />
    </div>
  );
}

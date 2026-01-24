/**
 * Main action button to start processing.
 * Shows spinning @ animation during processing.
 */

import { cn } from "@/lib/utils";
import { useInputStore, useProcessingStore, useAuthStore } from "@/store";

interface ProcessButtonProps {
  className?: string;
}

export function ProcessButton({ className }: ProcessButtonProps) {
  // Subscribe to input state that affects canProcess to trigger re-renders
  const canProcess = useInputStore((state) => {
    const hasInput = state.getActiveInputType() !== "none";
    const hasValidationErrors = state.validationErrors.length > 0;
    const hasInvalidFiles = state.files.some((f) => !f.isValid);
    return hasInput && !hasValidationErrors && !hasInvalidFiles;
  });
  const status = useProcessingStore((state) => state.status);
  const startProcessing = useProcessingStore((state) => state.startProcessing);
  const usage = useAuthStore((state) => state.usage);

  const isProcessing = status === "processing";
  // Prompt selection is optional - if none selected, basic transcript output is used
  // Check both input state and credits
  const hasCredits = usage?.can_process ?? false;
  const isDisabled = !canProcess || !hasCredits || isProcessing;

  // Determine button state message
  let disabledReason = "";
  if (!usage?.can_process) {
    disabledReason = "NO CREDITS";
  }

  const handleClick = () => {
    if (!isDisabled) {
      startProcessing();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "w-full py-4 font-mono text-lg uppercase tracking-widest transition-all border-2 border-border",
          isProcessing
            ? "bg-neo-yellow text-foreground cursor-wait"
            : isDisabled
              ? "bg-background/50 text-foreground/40 cursor-not-allowed"
              : "bg-main text-main-foreground shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none"
        )}
      >
        {isProcessing ? (
          <span className="inline-flex items-center gap-2">
            <span className="animate-spin">@</span>
            PROCESSING...
          </span>
        ) : (
          "SMELT IT"
        )}
      </button>

      {disabledReason && !isProcessing && (
        <p className="text-xs font-mono text-foreground/40 text-center uppercase">{disabledReason}</p>
      )}
    </div>
  );
}

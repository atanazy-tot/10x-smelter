/**
 * Main action button to start processing.
 * Shows spinning @ animation during processing.
 */

import { cn } from "@/lib/utils";
import { useInputStore, useProcessingStore, useAuthStore, usePromptStore } from "@/store";

interface ProcessButtonProps {
  className?: string;
}

export function ProcessButton({ className }: ProcessButtonProps) {
  const canProcess = useInputStore((state) => state.canProcess);
  const status = useProcessingStore((state) => state.status);
  const startProcessing = useProcessingStore((state) => state.startProcessing);
  const usage = useAuthStore((state) => state.usage);
  const hasSelection = usePromptStore((state) => state.hasSelection);

  const isProcessing = status === "processing";
  const isDisabled = !canProcess() || isProcessing;

  // Determine button state message
  let disabledReason = "";
  if (!hasSelection()) {
    disabledReason = "SELECT A PROMPT";
  } else if (!usage?.can_process) {
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
          "w-full py-4 font-mono text-lg uppercase tracking-widest transition-all border-2 border-neo-black",
          isProcessing
            ? "bg-neo-yellow text-neo-black cursor-wait"
            : isDisabled
              ? "bg-neo-white/50 text-neo-black/40 cursor-not-allowed"
              : "bg-neo-lime text-neo-black shadow-[4px_4px_0px_0px_var(--neo-black)] hover:shadow-[2px_2px_0px_0px_var(--neo-black)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
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
        <p className="text-xs font-mono text-neo-black/40 text-center uppercase">{disabledReason}</p>
      )}
    </div>
  );
}

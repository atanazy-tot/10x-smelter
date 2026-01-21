/**
 * 10-block progress visualization with stage colors.
 */

import { cn } from "@/lib/utils";
import { useProcessingStore } from "@/store";
import type { SmeltStatus } from "@/types";

interface ProgressBarProps {
  className?: string;
}

const TOTAL_BLOCKS = 10;

function getStageColor(stage: SmeltStatus): string {
  switch (stage) {
    case "validating":
      return "bg-stage-validating";
    case "decoding":
      return "bg-stage-decoding";
    case "transcribing":
      return "bg-stage-transcribing";
    case "synthesizing":
      return "bg-stage-synthesizing";
    case "completed":
      return "bg-stage-completed";
    case "failed":
      return "bg-stage-failed";
    default:
      return "bg-foreground/20";
  }
}

function getStageLabel(stage: SmeltStatus): string {
  switch (stage) {
    case "pending":
      return "STARTING...";
    case "validating":
      return "VALIDATING FILES...";
    case "decoding":
      return "DECODING AUDIO...";
    case "transcribing":
      return "TRANSCRIBING...";
    case "synthesizing":
      return "SYNTHESIZING OUTPUT...";
    case "completed":
      return "DONE!";
    case "failed":
      return "FAILED";
    default:
      return "PROCESSING...";
  }
}

export function ProgressBar({ className }: ProgressBarProps) {
  const status = useProcessingStore((state) => state.status);
  const progress = useProcessingStore((state) => state.progress);

  // Don't show if not processing
  if (status !== "processing" || !progress) {
    return null;
  }

  const percentage = progress.percentage;
  const stage = progress.stage;
  const filledBlocks = Math.floor((percentage / 100) * TOTAL_BLOCKS);
  const stageColor = getStageColor(stage);
  const stageLabel = getStageLabel(stage);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Progress blocks */}
      <div className="flex gap-1">
        {Array.from({ length: TOTAL_BLOCKS }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-8 border-2 border-border transition-colors duration-300",
              index < filledBlocks ? stageColor : "bg-background"
            )}
          />
        ))}
      </div>

      {/* Progress info */}
      <div className="flex justify-between items-center font-mono text-sm">
        <span className="uppercase text-foreground">{stageLabel}</span>
        <span className="text-foreground/60">{percentage}%</span>
      </div>

      {/* Progress message if different from stage label */}
      {progress.message && progress.message !== stageLabel && (
        <p className="text-xs font-mono text-foreground/40 uppercase">{progress.message}</p>
      )}
    </div>
  );
}

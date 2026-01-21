/**
 * Orchestrator component for output section containing progress, results, and errors.
 */

import { cn } from "@/lib/utils";
import { useProcessingStore } from "@/store";
import { ProgressBar } from "./ProgressBar";
import { ResultsView } from "./ResultsView";
import { ErrorDisplay } from "./ErrorDisplay";

interface OutputSectionProps {
  className?: string;
}

export function OutputSection({ className }: OutputSectionProps) {
  const status = useProcessingStore((state) => state.status);

  // Don't render anything if idle
  if (status === "idle") {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <ProgressBar />
      <ResultsView />
      <ErrorDisplay />
    </div>
  );
}

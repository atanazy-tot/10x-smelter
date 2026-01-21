/**
 * Orchestrator component for controls section.
 */

import { cn } from "@/lib/utils";
import { CombineModeToggle } from "./CombineModeToggle";
import { PredefinedPromptSelector } from "./PredefinedPromptSelector";
import { ProcessButton } from "./ProcessButton";

interface ControlsSectionProps {
  className?: string;
}

export function ControlsSection({ className }: ControlsSectionProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <CombineModeToggle />
      <PredefinedPromptSelector />
      <ProcessButton />
    </div>
  );
}

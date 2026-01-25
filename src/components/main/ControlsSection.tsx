/**
 * Orchestrator component for controls section.
 * Prompt selection is hidden for anonymous users (they auto-get summarize).
 */

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { CombineModeToggle } from "./CombineModeToggle";
import { PredefinedPromptSelector } from "./PredefinedPromptSelector";
import { CustomPromptsSection } from "@/components/prompts/CustomPromptsSection";
import { ProcessButton } from "./ProcessButton";

interface ControlsSectionProps {
  className?: string;
}

export function ControlsSection({ className }: ControlsSectionProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <CombineModeToggle />
      {/* Only show prompt selectors for authenticated users */}
      {isAuthenticated && <PredefinedPromptSelector />}
      {isAuthenticated && <CustomPromptsSection />}
      <ProcessButton />
    </div>
  );
}

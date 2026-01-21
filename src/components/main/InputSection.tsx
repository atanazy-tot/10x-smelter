/**
 * Orchestrator component for input section containing DropZone, TextZone, and divider.
 */

import { cn } from "@/lib/utils";
import { DropZone } from "./DropZone";
import { TextZone } from "./TextZone";
import { InputDivider } from "./InputDivider";

interface InputSectionProps {
  className?: string;
}

export function InputSection({ className }: InputSectionProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <DropZone />
      <InputDivider />
      <TextZone />
    </div>
  );
}

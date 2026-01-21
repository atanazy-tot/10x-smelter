/**
 * Visual divider between DropZone and TextZone showing input mode.
 * Shows "OR" when only one input type, "AND" when both are present (mixed mode).
 */

import { cn } from "@/lib/utils";
import { useInputStore } from "@/store";

interface InputDividerProps {
  className?: string;
}

export function InputDivider({ className }: InputDividerProps) {
  const getActiveInputType = useInputStore((state) => state.getActiveInputType);
  const activeInputType = getActiveInputType();

  const label = activeInputType === "both" ? "AND" : "OR";

  return (
    <div className={cn("flex items-center gap-4 py-4", className)}>
      <div className="flex-1 h-[2px] bg-neo-black" />
      <span
        className={cn(
          "font-mono text-sm uppercase tracking-widest px-4",
          activeInputType === "both" ? "text-neo-lime" : "text-neo-black/60"
        )}
      >
        {label}
      </span>
      <div className="flex-1 h-[2px] bg-neo-black" />
    </div>
  );
}

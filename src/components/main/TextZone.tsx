/**
 * Text input area for pasting notes with character counter.
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useInputStore } from "@/store";

const MAX_TEXT_LENGTH = 50000;

interface TextZoneProps {
  className?: string;
}

export function TextZone({ className }: TextZoneProps) {
  const text = useInputStore((state) => state.text);
  const setText = useInputStore((state) => state.setText);
  const validationErrors = useInputStore((state) => state.validationErrors);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    [setText]
  );

  const textErrors = validationErrors.filter((e) => e.source === "text");
  const charCount = text.length;
  const isNearLimit = charCount > MAX_TEXT_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_TEXT_LENGTH;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="PASTE YOUR TEXT HERE..."
          className={cn(
            "w-full min-h-[160px] bg-neo-white text-neo-black font-mono text-sm border-2 border-neo-black p-4 placeholder:text-neo-black/40 placeholder:uppercase focus:outline-none focus:ring-0 resize-none",
            isOverLimit && "border-neo-coral"
          )}
          aria-label="Text input"
        />

        {/* Character counter */}
        <div
          className={cn(
            "absolute bottom-2 right-2 text-xs font-mono uppercase",
            isOverLimit ? "text-neo-coral" : isNearLimit ? "text-neo-yellow" : "text-neo-black/40"
          )}
        >
          {charCount.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
        </div>
      </div>

      {/* Text errors */}
      {textErrors.map((error, idx) => (
        <p key={idx} className="text-sm font-mono text-neo-coral uppercase">
          {error.message}
        </p>
      ))}
    </div>
  );
}

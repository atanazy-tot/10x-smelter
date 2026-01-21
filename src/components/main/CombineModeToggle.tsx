/**
 * Toggle between SEPARATE and COMBINE processing modes.
 * Only visible when 2+ files are uploaded.
 * COMBINE mode is disabled for anonymous users.
 */

import { cn } from "@/lib/utils";
import { useInputStore, useAuthStore } from "@/store";
import type { SmeltMode } from "@/types";

interface CombineModeToggleProps {
  className?: string;
}

export function CombineModeToggle({ className }: CombineModeToggleProps) {
  const files = useInputStore((state) => state.files);
  const mode = useInputStore((state) => state.mode);
  const setMode = useInputStore((state) => state.setMode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const validFilesCount = files.filter((f) => f.isValid).length;

  // Only show when 2+ valid files
  if (validFilesCount < 2) {
    return null;
  }

  const handleModeChange = (newMode: SmeltMode) => {
    if (newMode === "combine" && !isAuthenticated) {
      return; // Disabled for anonymous users
    }
    setMode(newMode);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs font-mono uppercase text-neo-black/60 tracking-wider">PROCESSING MODE</p>

      <div className="flex border-2 border-neo-black">
        <button
          type="button"
          onClick={() => handleModeChange("separate")}
          className={cn(
            "flex-1 py-2 px-4 font-mono text-sm uppercase tracking-wider transition-colors",
            mode === "separate" ? "bg-neo-black text-neo-white" : "bg-neo-white text-neo-black hover:bg-neo-black/10"
          )}
        >
          SEPARATE
        </button>

        <button
          type="button"
          onClick={() => handleModeChange("combine")}
          disabled={!isAuthenticated}
          title={!isAuthenticated ? "LOGIN REQUIRED FOR COMBINE MODE" : undefined}
          className={cn(
            "flex-1 py-2 px-4 font-mono text-sm uppercase tracking-wider transition-colors border-l-2 border-neo-black",
            mode === "combine"
              ? "bg-neo-black text-neo-white"
              : isAuthenticated
                ? "bg-neo-white text-neo-black hover:bg-neo-black/10"
                : "bg-neo-white/50 text-neo-black/40 cursor-not-allowed"
          )}
        >
          COMBINE
        </button>
      </div>

      <p className="text-xs font-mono text-neo-black/40">
        {mode === "separate" ? "EACH FILE PROCESSED INDIVIDUALLY" : "ALL FILES COMBINED INTO ONE OUTPUT"}
      </p>

      {!isAuthenticated && (
        <p className="text-xs font-mono text-neo-coral uppercase">LOGIN REQUIRED FOR COMBINE MODE</p>
      )}
    </div>
  );
}

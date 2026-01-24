import { cn } from "@/lib/utils";
import type { AuthMode } from "./types";

interface AuthModeToggleProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  disabled?: boolean;
}

export function AuthModeToggle({ mode, onModeChange, disabled }: AuthModeToggleProps) {
  return (
    <div className="flex border-2 border-border">
      <button
        type="button"
        onClick={() => onModeChange("login")}
        disabled={disabled}
        className={cn(
          "flex-1 py-2 px-4 font-mono text-sm uppercase tracking-wider transition-colors",
          mode === "login" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-foreground/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        LOGIN
      </button>

      <button
        type="button"
        onClick={() => onModeChange("register")}
        disabled={disabled}
        className={cn(
          "flex-1 py-2 px-4 font-mono text-sm uppercase tracking-wider transition-colors border-l-2 border-border",
          mode === "register"
            ? "bg-foreground text-background"
            : "bg-background text-foreground hover:bg-foreground/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        REGISTER
      </button>
    </div>
  );
}

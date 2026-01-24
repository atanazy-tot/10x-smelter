import { AlertTriangle } from "lucide-react";
import type { AuthFormError } from "./types";

interface ErrorMessageProps {
  error: AuthFormError | null;
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className="bg-neo-coral/20 border-2 border-neo-coral p-3 flex items-center gap-2">
      <AlertTriangle className="size-4 text-neo-coral shrink-0" />
      <span className="font-mono text-sm text-neo-coral uppercase">{error.message}</span>
    </div>
  );
}

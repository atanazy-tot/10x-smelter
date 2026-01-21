/**
 * Individual file display with remove button and validation status.
 */

import { X, FileAudio, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileWithValidation } from "@/store/types";

interface FileItemProps {
  file: FileWithValidation;
  onRemove: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileItem({ file, onRemove }: FileItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 border-2 border-border font-mono text-sm",
        file.isValid ? "bg-background" : "bg-neo-coral/20"
      )}
    >
      {file.isValid ? (
        <FileAudio className="w-5 h-5 text-foreground shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-neo-coral shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="truncate uppercase text-foreground">{file.file.name}</p>
        <p className="text-xs text-foreground/60">{formatFileSize(file.file.size)}</p>
        {file.error && <p className="text-xs text-neo-coral uppercase mt-1">{file.error.message}</p>}
      </div>

      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="p-1 hover:bg-foreground/10 transition-colors"
        aria-label={`Remove ${file.file.name}`}
      >
        <X className="w-4 h-4 text-foreground" />
      </button>
    </div>
  );
}

/**
 * Individual result display with copy and download buttons.
 */

import { Copy, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClipboard } from "@/components/hooks/useClipboard";
import type { SmeltResultDTO } from "@/types";

interface ResultItemProps {
  result: SmeltResultDTO;
  className?: string;
}

export function ResultItem({ result, className }: ResultItemProps) {
  const { copied, copy } = useClipboard();

  const handleCopy = () => {
    copy(result.content);
  };

  const handleDownload = () => {
    const blob = new Blob([result.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename.replace(/\.[^/.]+$/, "") + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-neo-black border-2 border-neo-black">
        <span className="font-mono text-sm uppercase text-neo-lime truncate">{result.filename}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 text-neo-white hover:text-neo-lime transition-colors"
            aria-label="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 text-neo-white hover:text-neo-lime transition-colors"
            aria-label="Download as markdown"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-neo-black border-2 border-t-0 border-neo-black p-4 max-h-[400px] overflow-y-auto">
        <pre className="font-mono text-sm text-neo-lime whitespace-pre-wrap break-words">{result.content}</pre>
      </div>
    </div>
  );
}

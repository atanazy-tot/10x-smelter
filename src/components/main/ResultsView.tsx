/**
 * Displays processing results with carousel navigation for multiple results.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProcessingStore } from "@/store";
import { ResultItem } from "./ResultItem";

interface ResultsViewProps {
  className?: string;
}

export function ResultsView({ className }: ResultsViewProps) {
  const status = useProcessingStore((state) => state.status);
  const results = useProcessingStore((state) => state.results);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Don't show if not completed or no results
  if (status !== "completed" || results.length === 0) {
    return null;
  }

  const hasMultipleResults = results.length > 1;
  const currentResult = results[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Results header */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-lg uppercase text-neo-black tracking-wider">RESULTS</h2>

        {hasMultipleResults && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrevious}
              className="p-2 border-2 border-neo-black bg-neo-white hover:bg-neo-black hover:text-neo-white transition-colors"
              aria-label="Previous result"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-sm text-neo-black">
              {currentIndex + 1} / {results.length}
            </span>

            <button
              type="button"
              onClick={goToNext}
              className="p-2 border-2 border-neo-black bg-neo-white hover:bg-neo-black hover:text-neo-white transition-colors"
              aria-label="Next result"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Current result */}
      {currentResult && <ResultItem result={currentResult} />}

      {/* Result indicators for multiple results */}
      {hasMultipleResults && (
        <div className="flex justify-center gap-2">
          {results.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-3 h-3 border-2 border-neo-black transition-colors",
                index === currentIndex ? "bg-neo-lime" : "bg-neo-white hover:bg-neo-black/20"
              )}
              aria-label={`Go to result ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

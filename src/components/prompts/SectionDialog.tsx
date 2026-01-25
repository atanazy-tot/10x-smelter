/**
 * Dialog for creating/renaming prompt sections.
 */

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";

interface SectionDialogProps {
  className?: string;
}

export function SectionDialog({ className }: SectionDialogProps) {
  const sectionDialogOpen = usePromptStore((state) => state.sectionDialogOpen);
  const editingSection = usePromptStore((state) => state.editingSection);
  const setSectionDialogOpen = usePromptStore((state) => state.setSectionDialogOpen);
  const createSection = usePromptStore((state) => state.createSection);
  const updateSection = usePromptStore((state) => state.updateSection);

  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingSection !== null;

  // Initialize form when editing
  useEffect(() => {
    if (editingSection) {
      setTitle(editingSection.title);
    } else {
      setTitle("");
    }
    setError(null);
  }, [editingSection, sectionDialogOpen]);

  const handleClose = () => {
    setSectionDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("SECTION TITLE IS REQUIRED");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && editingSection) {
        await updateSection(editingSection.id, title.trim());
      } else {
        await createSection(title.trim());
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED TO SAVE SECTION");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sectionDialogOpen) {
    return null;
  }

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-background border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <h2 className="font-mono text-lg uppercase tracking-wider text-foreground">
            {isEditing ? "RENAME SECTION" : "NEW SECTION"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-foreground/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {error && (
            <p className="font-mono text-sm text-neo-coral uppercase p-2 bg-neo-coral/10 border-2 border-neo-coral">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="section-title" className="font-mono text-xs uppercase text-foreground/60">
              SECTION TITLE
            </label>
            <input
              id="section-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G., WORK PROMPTS"
              className="w-full p-3 font-mono text-sm border-2 border-border bg-background text-foreground placeholder:text-foreground/40 placeholder:uppercase focus:outline-none"
              maxLength={100}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 font-mono text-sm uppercase tracking-wider border-2 border-border bg-background text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 py-3 font-mono text-sm uppercase tracking-wider border-2 border-border transition-colors",
                isSubmitting
                  ? "bg-foreground/50 text-background cursor-wait"
                  : "bg-main text-main-foreground hover:bg-foreground hover:text-main"
              )}
            >
              {isSubmitting ? "SAVING..." : isEditing ? "RENAME" : "CREATE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Editor overlay for creating/editing prompts.
 */

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/store";

interface PromptEditorProps {
  className?: string;
}

export function PromptEditor({ className }: PromptEditorProps) {
  const editorOpen = usePromptStore((state) => state.editorOpen);
  const editingPrompt = usePromptStore((state) => state.editingPrompt);
  const setEditorOpen = usePromptStore((state) => state.setEditorOpen);
  const createPrompt = usePromptStore((state) => state.createPrompt);
  const updatePrompt = usePromptStore((state) => state.updatePrompt);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingPrompt !== null;

  // Initialize form when editing
  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setBody(editingPrompt.body);
    } else {
      setTitle("");
      setBody("");
    }
    setError(null);
  }, [editingPrompt, editorOpen]);

  const handleClose = () => {
    setEditorOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      setError("TITLE AND BODY ARE REQUIRED");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && editingPrompt) {
        await updatePrompt(editingPrompt.id, title.trim(), body.trim());
      } else {
        await createPrompt(title.trim(), body.trim());
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED TO SAVE PROMPT");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!editorOpen) {
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
        aria-label="Close editor"
      />

      {/* Editor */}
      <div className="relative w-full max-w-lg bg-background border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <h2 className="font-mono text-lg uppercase tracking-wider text-foreground">
            {isEditing ? "EDIT PROMPT" : "NEW PROMPT"}
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
            <label htmlFor="prompt-title" className="font-mono text-xs uppercase text-foreground/60">
              TITLE
            </label>
            <input
              id="prompt-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G., MEETING SUMMARY"
              className="w-full p-3 font-mono text-sm border-2 border-border bg-background text-foreground placeholder:text-foreground/40 placeholder:uppercase focus:outline-none"
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="prompt-body" className="font-mono text-xs uppercase text-foreground/60">
              PROMPT BODY
            </label>
            <textarea
              id="prompt-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ENTER YOUR PROMPT INSTRUCTIONS..."
              className="w-full min-h-[200px] p-3 font-mono text-sm border-2 border-border bg-background text-foreground placeholder:text-foreground/40 placeholder:uppercase focus:outline-none resize-none"
              maxLength={5000}
            />
            <span className="font-mono text-xs text-foreground/40 text-right">{body.length}/5000</span>
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
              {isSubmitting ? "SAVING..." : isEditing ? "UPDATE" : "CREATE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

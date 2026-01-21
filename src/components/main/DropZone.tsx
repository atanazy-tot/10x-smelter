/**
 * Drag-and-drop file upload area with validation feedback.
 */

import { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInputStore, useAuthStore } from "@/store";
import { FileItem } from "./FileItem";

interface DropZoneProps {
  className?: string;
}

export function DropZone({ className }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files = useInputStore((state) => state.files);
  const addFiles = useInputStore((state) => state.addFiles);
  const removeFile = useInputStore((state) => state.removeFile);
  const maxFilesAllowed = useInputStore((state) => state.maxFilesAllowed);
  const validationErrors = useInputStore((state) => state.validationErrors);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        addFiles(selectedFiles);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [addFiles]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const fileErrors = validationErrors.filter((e) => e.source === "file");
  const validFilesCount = files.filter((f) => f.isValid).length;
  const max = maxFilesAllowed();

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Drop area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-border bg-background cursor-pointer transition-all font-mono",
          isDragging && "bg-main/20 border-main",
          "hover:bg-foreground/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
          multiple={isAuthenticated}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload audio files"
        />

        <Upload className="w-12 h-12 text-foreground" />

        <div className="text-center">
          <p className="text-lg uppercase tracking-wider text-foreground">
            {isDragging ? "DROP IT" : "DROP AUDIO FILES HERE"}
          </p>
          <p className="text-sm text-foreground/60 mt-1">OR CLICK TO BROWSE</p>
          <p className="text-xs text-foreground/40 mt-2">.MP3 .WAV .M4A - MAX 25MB</p>
        </div>

        {!isAuthenticated && <p className="text-xs text-foreground/60 uppercase">1 FILE LIMIT - LOGIN FOR MORE</p>}

        {isAuthenticated && (
          <p className="text-xs text-foreground/60 uppercase">
            {validFilesCount}/{max} FILES
          </p>
        )}
      </div>

      {/* File errors */}
      {fileErrors.map((error, idx) => (
        <p key={idx} className="text-sm font-mono text-neo-coral uppercase">
          {error.message}
        </p>
      ))}

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <FileItem key={file.id} file={file} onRemove={removeFile} />
          ))}
        </div>
      )}
    </div>
  );
}

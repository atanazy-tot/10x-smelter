/**
 * Input store for file and text input management.
 */

import { create } from "zustand";
import type { InputState, FileWithValidation, ActiveInputType, ValidationError } from "./types";
import type { SmeltMode } from "@/types";
import { useAuthStore } from "./auth";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES_AUTHENTICATED = 5;
const MAX_FILES_ANONYMOUS = 1;
const MAX_TEXT_LENGTH = 50000;
const VALID_AUDIO_EXTENSIONS = ["mp3", "wav", "m4a"];

function generateId(): string {
  return crypto.randomUUID();
}

function validateFile(file: File): FileWithValidation {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isValidFormat = VALID_AUDIO_EXTENSIONS.includes(ext);
  const isValidSize = file.size <= MAX_FILE_SIZE;

  if (!isValidFormat) {
    return {
      id: generateId(),
      file,
      isValid: false,
      error: {
        code: "invalid_format",
        message: "CAN'T READ THAT. TRY .MP3 .WAV .M4A",
      },
    };
  }

  if (!isValidSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      id: generateId(),
      file,
      isValid: false,
      error: {
        code: "too_large",
        message: `FILE TOO CHUNKY. MAX 25MB. YOUR FILE: ${sizeMB}MB`,
      },
    };
  }

  return {
    id: generateId(),
    file,
    isValid: true,
  };
}

export const useInputStore = create<InputState>((set, get) => ({
  files: [],
  text: "",
  mode: "separate",
  validationErrors: [],

  addFiles: (newFiles: File[]) => {
    const state = get();
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    const maxFiles = isAuthenticated ? MAX_FILES_AUTHENTICATED : MAX_FILES_ANONYMOUS;

    const validatedFiles = newFiles.map(validateFile);
    const currentValidFiles = state.files.filter((f) => f.isValid);
    const newValidFiles = validatedFiles.filter((f) => f.isValid);

    // Check if adding would exceed limit
    const totalValid = currentValidFiles.length + newValidFiles.length;
    const errors: ValidationError[] = [];

    if (totalValid > maxFiles) {
      const message = isAuthenticated ? "MAX 5 FILES ALLOWED" : "LOGIN FOR MULTI-FILE PROCESSING";
      errors.push({ source: "file", message });
    }

    // Only add files up to the limit
    const allowedCount = Math.max(0, maxFiles - currentValidFiles.length);
    const filesToAdd = validatedFiles.slice(0, allowedCount);

    // Add invalid files for display (but they won't count toward limit)
    const invalidFiles = validatedFiles.filter((f) => !f.isValid);
    const allFilesToAdd = [...filesToAdd, ...invalidFiles.slice(0, 3)]; // Show max 3 invalid files

    set({
      files: [...state.files, ...allFilesToAdd],
      validationErrors: errors,
    });
  },

  removeFile: (id: string) => {
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      validationErrors: [],
    }));
  },

  setText: (text: string) => {
    const errors: ValidationError[] = [];
    if (text.length > MAX_TEXT_LENGTH) {
      errors.push({
        source: "text",
        message: `TEXT TOO LONG. MAX ${MAX_TEXT_LENGTH} CHARS`,
      });
    }
    set({ text: text.slice(0, MAX_TEXT_LENGTH + 100), validationErrors: errors });
  },

  setMode: (mode: SmeltMode) => {
    set({ mode });
  },

  clearAll: () => {
    set({
      files: [],
      text: "",
      mode: "separate",
      validationErrors: [],
    });
  },

  getActiveInputType: (): ActiveInputType => {
    const state = get();
    const hasFiles = state.files.filter((f) => f.isValid).length > 0;
    const hasText = state.text.trim().length > 0;

    if (hasFiles && hasText) return "both";
    if (hasFiles) return "files";
    if (hasText) return "text";
    return "none";
  },

  canProcess: (): boolean => {
    const state = get();
    const authState = useAuthStore.getState();

    // Must have input
    const hasInput = state.getActiveInputType() !== "none";
    if (!hasInput) return false;

    // Must have no validation errors
    if (state.validationErrors.length > 0) return false;

    // Must have valid files (no invalid files blocking)
    const hasInvalidFiles = state.files.some((f) => !f.isValid);
    if (hasInvalidFiles) return false;

    // Must have credits
    if (!authState.usage?.can_process) return false;

    return true;
  },

  maxFilesAllowed: (): number => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    return isAuthenticated ? MAX_FILES_AUTHENTICATED : MAX_FILES_ANONYMOUS;
  },
}));

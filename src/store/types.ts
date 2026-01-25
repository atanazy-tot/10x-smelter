/**
 * ViewModel types for the Main Processing Page state management.
 * These types are used by Zustand stores and React components.
 */

import type {
  UsageDTO,
  SmeltProgressDTO,
  SmeltFileProgressDTO,
  SmeltResultDTO,
  SmeltErrorCode,
  DefaultPromptName,
  SmeltMode,
  PromptDTO,
  PromptSectionWithCountDTO,
} from "@/types";

// =============================================================================
// File Types
// =============================================================================

/**
 * Validation error codes for file input
 */
export type FileErrorCode = "too_large" | "invalid_format";

/**
 * File with validation state for UI tracking
 */
export interface FileWithValidation {
  /** Generated UUID for tracking in UI */
  id: string;
  /** Original File object */
  file: File;
  /** Whether the file passed validation */
  isValid: boolean;
  /** Validation error if any */
  error?: {
    code: FileErrorCode;
    message: string;
  };
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Active input type based on current state
 */
export type ActiveInputType = "none" | "files" | "text" | "both";

/**
 * Validation error for any input source
 */
export interface ValidationError {
  source: "file" | "text" | "mode" | "prompt";
  message: string;
}

// =============================================================================
// Processing Types
// =============================================================================

/**
 * Current processing status
 */
export type ProcessingStatus = "idle" | "processing" | "completed" | "failed";

/**
 * Error state during processing
 */
export interface ProcessingError {
  code: SmeltErrorCode | "connection_lost" | "unknown";
  message: string;
}

// =============================================================================
// Prompt Selection Types
// =============================================================================

/**
 * Current prompt selection state
 */
export interface PromptSelection {
  predefined: DefaultPromptName[];
  customId: string | null;
}

// =============================================================================
// Store State Types
// =============================================================================

export interface AuthState {
  user: { id: string; email: string } | null;
  isAuthenticated: boolean;
  usage: UsageDTO | null;
  isLoading: boolean;
  setUser: (user: { id: string; email: string } | null) => void;
  setUsage: (usage: UsageDTO | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  refreshUsage: () => Promise<void>;
  initialize: () => Promise<void>;
}

export interface InputState {
  files: FileWithValidation[];
  text: string;
  mode: SmeltMode;
  validationErrors: ValidationError[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  setText: (text: string) => void;
  setMode: (mode: SmeltMode) => void;
  clearAll: () => void;
  getActiveInputType: () => ActiveInputType;
  canProcess: () => boolean;
  maxFilesAllowed: () => number;
}

export interface PromptState {
  selectedPredefinedPrompts: DefaultPromptName[];
  selectedCustomPromptId: string | null;
  customPrompts: PromptDTO[];
  sections: PromptSectionWithCountDTO[];
  isLoading: boolean;
  editorOpen: boolean;
  editingPrompt: PromptDTO | null;
  // Section dialog state
  sectionDialogOpen: boolean;
  editingSection: PromptSectionWithCountDTO | null;
  togglePredefinedPrompt: (name: DefaultPromptName) => void;
  selectCustomPrompt: (id: string | null) => void;
  loadPrompts: () => Promise<void>;
  loadSections: () => Promise<void>;
  setEditorOpen: (open: boolean) => void;
  setEditingPrompt: (prompt: PromptDTO | null) => void;
  createPrompt: (title: string, body: string, sectionId?: string) => Promise<PromptDTO>;
  updatePrompt: (id: string, title: string, body: string, sectionId?: string | null) => Promise<PromptDTO>;
  deletePrompt: (id: string) => Promise<void>;
  hasSelection: () => boolean;
  // Section management
  setSectionDialogOpen: (open: boolean) => void;
  setEditingSection: (section: PromptSectionWithCountDTO | null) => void;
  createSection: (title: string) => Promise<PromptSectionWithCountDTO>;
  updateSection: (id: string, title: string) => Promise<PromptSectionWithCountDTO>;
  deleteSection: (id: string) => Promise<void>;
  // Drag and drop
  movePromptToSection: (promptId: string, sectionId: string | null) => Promise<void>;
}

export interface ProcessingState {
  status: ProcessingStatus;
  smeltId: string | null;
  progress: SmeltProgressDTO | null;
  fileProgress: SmeltFileProgressDTO[];
  results: SmeltResultDTO[];
  error: ProcessingError | null;
  subscriptionChannel: string | null;
  startProcessing: () => Promise<void>;
  handleProgress: (progress: SmeltProgressDTO, fileProgress: SmeltFileProgressDTO[]) => void;
  handleCompleted: (results: SmeltResultDTO[]) => void;
  handleFailed: (code: SmeltErrorCode | string, message: string) => void;
  reset: () => void;
}

export interface UIState {
  mobilePromptOverlayOpen: boolean;
  toggleMobilePromptOverlay: () => void;
  setMobilePromptOverlayOpen: (open: boolean) => void;
}

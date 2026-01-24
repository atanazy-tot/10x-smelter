/**
 * Processing store for smelt operation state management.
 */

import { create } from "zustand";
import type { ProcessingState } from "./types";
import type {
  SmeltProgressDTO,
  SmeltFileProgressDTO,
  SmeltResultDTO,
  SmeltErrorCode,
  SmeltCreateResponseDTO,
} from "@/types";
import { useInputStore } from "./input";
import { usePromptStore } from "./prompt";
import { useAuthStore } from "./auth";
import { isMockModeEnabled, runMockProcessing } from "@/lib/mock/mock-processing";
import { getAccessToken } from "@/lib/utils/token-storage";

export const useProcessingStore = create<ProcessingState>((set) => ({
  status: "idle",
  smeltId: null,
  progress: null,
  fileProgress: [],
  results: [],
  error: null,
  subscriptionChannel: null,

  startProcessing: async () => {
    const inputState = useInputStore.getState();
    const promptState = usePromptStore.getState();

    // Check if mock mode is enabled
    if (isMockModeEnabled()) {
      // Set initial processing state with mock smeltId
      set({
        status: "processing",
        smeltId: `mock-${Date.now()}`,
        error: null,
        results: [],
        progress: {
          percentage: 0,
          stage: "pending",
          message: "STARTING...",
        },
        subscriptionChannel: null,
      });

      // Run mock processing with store handlers
      runMockProcessing(inputState.files, inputState.text, {
        onProgress: (progress, fileProgress) => {
          set({ progress, fileProgress });
        },
        onCompleted: (results) => {
          set({
            status: "completed",
            results,
            progress: {
              percentage: 100,
              stage: "completed",
              message: "DONE!",
            },
          });
        },
        onFailed: (code, message) => {
          set({
            status: "failed",
            error: { code: code as SmeltErrorCode, message },
          });
        },
      });

      return;
    }

    // Build form data
    const formData = new FormData();

    // Add files
    const validFiles = inputState.files.filter((f) => f.isValid);
    for (const fileWithValidation of validFiles) {
      formData.append("files[]", fileWithValidation.file);
    }

    // Add text if present
    if (inputState.text.trim()) {
      formData.append("text", inputState.text.trim());
    }

    // Add mode
    formData.append("mode", inputState.mode);

    // Add prompts
    if (promptState.selectedPredefinedPrompts.length > 0) {
      for (const name of promptState.selectedPredefinedPrompts) {
        formData.append("default_prompt_names[]", name);
      }
    }

    if (promptState.selectedCustomPromptId) {
      formData.append("user_prompt_id", promptState.selectedCustomPromptId);
    }

    // Set processing state
    set({
      status: "processing",
      error: null,
      results: [],
      progress: {
        percentage: 0,
        stage: "pending",
        message: "STARTING...",
      },
    });

    try {
      const token = getAccessToken();
      const response = await fetch("/api/smelts", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        set({
          status: "failed",
          error: {
            code: error.code || "unknown",
            message: error.message || "PROCESSING FAILED",
          },
        });
        return;
      }

      const data: SmeltCreateResponseDTO = await response.json();
      set({
        smeltId: data.id,
        subscriptionChannel: data.subscription_channel,
        progress: {
          percentage: 5,
          stage: "pending",
          message: "QUEUED...",
        },
      });

      // Refresh usage after submitting (decrement credits)
      useAuthStore.getState().refreshUsage();
    } catch {
      set({
        status: "failed",
        error: {
          code: "connection_lost",
          message: "CONNECTION LOST. CHECK YOUR INTERNET AND TRY AGAIN",
        },
      });
    }
  },

  handleProgress: (progress: SmeltProgressDTO, fileProgress: SmeltFileProgressDTO[]) => {
    set({
      progress,
      fileProgress,
    });
  },

  handleCompleted: (results: SmeltResultDTO[]) => {
    set({
      status: "completed",
      results,
      progress: {
        percentage: 100,
        stage: "completed",
        message: "DONE!",
      },
    });
  },

  handleFailed: (code: SmeltErrorCode | string, message: string) => {
    set({
      status: "failed",
      error: {
        code: code as SmeltErrorCode,
        message,
      },
    });
  },

  reset: () => {
    set({
      status: "idle",
      smeltId: null,
      progress: null,
      fileProgress: [],
      results: [],
      error: null,
      subscriptionChannel: null,
    });
  },
}));

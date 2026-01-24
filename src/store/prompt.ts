/**
 * Prompt store for prompt selection and management.
 */

import { create } from "zustand";
import type { PromptState } from "./types";
import type { DefaultPromptName, PromptDTO, PromptsListDTO, PromptSectionsListDTO } from "@/types";
import { apiFetch } from "@/lib/utils/api-client";

export const usePromptStore = create<PromptState>((set, get) => ({
  selectedPredefinedPrompts: [],
  selectedCustomPromptId: null,
  customPrompts: [],
  sections: [],
  isLoading: false,
  editorOpen: false,
  editingPrompt: null,

  togglePredefinedPrompt: (name: DefaultPromptName) => {
    set((state) => {
      const isSelected = state.selectedPredefinedPrompts.includes(name);
      if (isSelected) {
        return {
          selectedPredefinedPrompts: state.selectedPredefinedPrompts.filter((n) => n !== name),
        };
      } else {
        return {
          selectedPredefinedPrompts: [...state.selectedPredefinedPrompts, name],
          // Clear custom prompt when selecting predefined
          selectedCustomPromptId: null,
        };
      }
    });
  },

  selectCustomPrompt: (id: string | null) => {
    set({
      selectedCustomPromptId: id,
      // Clear predefined prompts when selecting custom
      selectedPredefinedPrompts: id ? [] : get().selectedPredefinedPrompts,
    });
  },

  loadPrompts: async () => {
    set({ isLoading: true });
    try {
      const response = await apiFetch("/api/prompts?limit=100");
      if (response.ok) {
        const data: PromptsListDTO = await response.json();
        set({ customPrompts: data.prompts });
      }
    } catch {
      // Silently fail
    } finally {
      set({ isLoading: false });
    }
  },

  loadSections: async () => {
    try {
      const response = await apiFetch("/api/prompt-sections");
      if (response.ok) {
        const data: PromptSectionsListDTO = await response.json();
        set({ sections: data.sections });
      }
    } catch {
      // Silently fail
    }
  },

  setEditorOpen: (open: boolean) => {
    set({ editorOpen: open });
    if (!open) {
      set({ editingPrompt: null });
    }
  },

  setEditingPrompt: (prompt: PromptDTO | null) => {
    set({ editingPrompt: prompt, editorOpen: prompt !== null });
  },

  createPrompt: async (title: string, body: string, sectionId?: string) => {
    const response = await apiFetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, section_id: sectionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create prompt");
    }

    const prompt: PromptDTO = await response.json();
    set((state) => ({
      customPrompts: [...state.customPrompts, prompt],
      editorOpen: false,
      editingPrompt: null,
    }));

    // Reload sections to update counts
    get().loadSections();

    return prompt;
  },

  updatePrompt: async (id: string, title: string, body: string) => {
    const response = await apiFetch(`/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update prompt");
    }

    const prompt: PromptDTO = await response.json();
    set((state) => ({
      customPrompts: state.customPrompts.map((p) => (p.id === id ? prompt : p)),
      editorOpen: false,
      editingPrompt: null,
    }));

    return prompt;
  },

  deletePrompt: async (id: string) => {
    const response = await apiFetch(`/api/prompts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete prompt");
    }

    set((state) => ({
      customPrompts: state.customPrompts.filter((p) => p.id !== id),
      selectedCustomPromptId: state.selectedCustomPromptId === id ? null : state.selectedCustomPromptId,
    }));

    // Reload sections to update counts
    get().loadSections();
  },

  hasSelection: (): boolean => {
    const state = get();
    return state.selectedPredefinedPrompts.length > 0 || state.selectedCustomPromptId !== null;
  },
}));
